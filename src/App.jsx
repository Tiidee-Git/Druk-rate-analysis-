import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const baseRates = [
  { id: 1, category: 'material', description: 'Cement OPC 43 Grade', unit: 'Bag', bsrRate: 390, coefficient: 0.25, source: 'BSR' },
  { id: 2, category: 'material', description: 'Coarse Aggregate 20mm', unit: 'm3', bsrRate: 1450, coefficient: 0.8, source: 'BSR' },
  { id: 3, category: 'material', description: 'Sand', unit: 'm3', bsrRate: 1000, coefficient: 0.6, source: 'BSR' },
  { id: 4, category: 'labour', description: 'Mason', unit: 'day', bsrRate: 900, coefficient: 0.5, source: 'BSR' },
  { id: 5, category: 'labour', description: 'Helper', unit: 'day', bsrRate: 650, coefficient: 0.6, source: 'BSR' },
  { id: 6, category: 'equipment', description: 'Mixer Machine', unit: 'hr', bsrRate: 650, coefficient: 0.1, source: 'BSR' },
];

const dzongkhags = ['Thimphu', 'Paro', 'Punakha', 'Wangdue Phodrang', 'Trongsa', 'Bumthang', 'Sarpang', 'Tsirang', 'Dagana', 'Zhemgang', 'Lhuentse', 'Mongar', 'Trashigang', 'Trashiyangtse', 'Samdrup Jongkhar', 'Pemagatshel', 'Haa', 'Chukha', 'Gasa', 'Samtse'];
const fiscalYears = ['FY 2024-25', 'FY 2025-26', 'FY 2026-27'];
const marketEndpoint = import.meta.env.VITE_MARKET_RATE_API || 'https://example.com/api/market-rate';

const blankLine = () => ({
  id: crypto.randomUUID(),
  itemNo: '',
  description: '',
  unit: '',
  quantity: 1,
  type: 'BSR',
  materials: [],
  labour: [],
  equipment: [],
  sundries: [],
  overhead: 15,
  contingency: 5,
  notes: '',
});

const createDefaultItem = (idx) => {
  const item = blankLine();
  item.itemNo = `Item ${idx}`;
  item.description = 'Concrete Grade M20';
  item.unit = 'm3';
  item.quantity = 1;
  item.materials = [
    { id: crypto.randomUUID(), description: 'Cement OPC 43 Grade', unit: 'Bag', coefficient: 0.25, rate: 390, amount: 97.5 },
    { id: crypto.randomUUID(), description: 'Coarse Aggregate 20mm', unit: 'm3', coefficient: 0.8, rate: 1450, amount: 1160 },
    { id: crypto.randomUUID(), description: 'Sand', unit: 'm3', coefficient: 0.6, rate: 1000, amount: 600 },
  ];
  item.labour = [
    { id: crypto.randomUUID(), category: 'Mason', coefficient: 0.5, rate: 900, amount: 450 },
    { id: crypto.randomUUID(), category: 'Helper', coefficient: 0.6, rate: 650, amount: 390 },
  ];
  item.equipment = [
    { id: crypto.randomUUID(), description: 'Mixer Machine', coefficient: 0.1, rate: 650, amount: 65 },
  ];
  item.sundries = [];
  return item;
};

function formatNu(value) {
  return `Nu. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function calculateItem(item) {
  const sumSection = (rows) => rows.reduce((sum, row) => sum + (Number(row.coefficient || 0) * Number(row.rate || 0)), 0);
  const materials = sumSection(item.materials);
  const labour = sumSection(item.labour);
  const equipment = sumSection(item.equipment);
  const sundries = sumSection(item.sundries);
  const totalA = materials + labour + equipment + sundries;
  const totalB = totalA * (1 + Number(item.overhead || 0) / 100);
  const totalC = totalB * (1 + Number(item.contingency || 0) / 100);
  const itemRate = Math.round(totalC * 100) / 100;
  return { materials, labour, equipment, sundries, totalA, totalB, totalC, itemRate };
}

function App() {
  const [items, setItems] = useState([createDefaultItem(1)]);
  const [activeTab, setActiveTab] = useState('items');
  const [selectedTown, setSelectedTown] = useState('Thimphu');
  const [fiscalYear, setFiscalYear] = useState('FY 2025-26');
  const [activeItemId, setActiveItemId] = useState(items[0]?.id);
  const [marketCache, setMarketCache] = useState({});
  const [marketOverrides, setMarketOverrides] = useState({});

  const activeItem = items.find((item) => item.id === activeItemId) || items[0] || null;
  const itemSummary = useMemo(() => items.map((item) => ({ ...item, calc: calculateItem(item) })), [items]);

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateSectionRows = (section, id, patch) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const rows = item[section].map((row) => (row.id === patch.id ? { ...row, ...patch } : row));
      return { ...item, [section]: rows };
    }));
  };

  const addItem = () => {
    const next = createDefaultItem(items.length + 1);
    setItems((prev) => [...prev, next]);
    setActiveItemId(next.id);
    setActiveTab('items');
  };

  const duplicateItem = (id) => {
    const source = items.find((item) => item.id === id);
    if (!source) return;
    const copy = { ...source, id: crypto.randomUUID(), itemNo: `${source.itemNo} Copy`, description: `${source.description} Copy`, materials: source.materials.map((row) => ({ ...row, id: crypto.randomUUID() })), labour: source.labour.map((row) => ({ ...row, id: crypto.randomUUID() })), equipment: source.equipment.map((row) => ({ ...row, id: crypto.randomUUID() })), sundries: source.sundries.map((row) => ({ ...row, id: crypto.randomUUID() })) };
    setItems((prev) => [...prev, copy]);
    setActiveItemId(copy.id);
  };

  const removeItem = (id) => {
    setItems((prev) => { const next = prev.filter((item) => item.id !== id); return next.length ? next : [createDefaultItem(1)]; });
    if (activeItemId === id) {
      const remaining = items.filter((item) => item.id !== id);
      setActiveItemId(remaining[0]?.id || null);
    }
  };

  const addRow = (itemId, section) => {
    const row = { id: crypto.randomUUID(), description: '', unit: '', coefficient: 1, rate: 0, amount: 0, category: 'Helper' };
    setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, [section]: [...item[section], row] } : item));
  };

  const autoPopulate = (itemId, section, description) => {
    const match = baseRates.find((entry) => entry.description.toLowerCase() === description.toLowerCase());
    if (!match) return;
    const row = { id: crypto.randomUUID(), description: match.description, unit: match.unit, coefficient: match.coefficient, rate: match.bsrRate, amount: match.coefficient * match.bsrRate, category: match.category === 'labour' ? 'Helper' : '' };
    setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, [section]: [...item[section], row] } : item));
  };

  const applyBaseRate = (baseRate, section) => {
    if (!activeItem) return;
    const row = {
      id: crypto.randomUUID(),
      description: baseRate.description,
      unit: baseRate.unit,
      coefficient: baseRate.coefficient,
      rate: baseRate.bsrRate,
      amount: baseRate.coefficient * baseRate.bsrRate,
      category: baseRate.category === 'labour' ? 'Helper' : '',
    };
    setItems((prev) => prev.map((item) => item.id === activeItem.id ? { ...item, [section]: [...item[section], row] } : item));
  };

  const refreshMarketRate = async (description, section) => {
    const key = `${description}-${section}`;
    const payload = {
      item: description,
      location: selectedTown,
      fiscalYear,
      section,
    };
    let rateData = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(marketEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const rate = Number(data?.rate);
        if (Number.isFinite(rate) && rate > 0) {
          rateData = { rate, source: data?.source || 'Market source', url: data?.url || '', date: data?.date || new Date().toLocaleDateString() };
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    if (!rateData) {
      rateData = { rate: null, source: 'Market rate unavailable — using BSR', url: '', date: new Date().toLocaleDateString() };
    }
    setMarketCache((prev) => ({ ...prev, [key]: rateData }));
  };

  const exportWorkbook = () => {
    const workbook = XLSX.utils.book_new();
    const cover = [['Druk Rate Analysis', ''], ['Fiscal Year', fiscalYear], ['Base Town', selectedTown], ['Generated', new Date().toLocaleString()]];
    const coverSheet = XLSX.utils.aoa_to_sheet(cover);
    XLSX.utils.book_append_sheet(workbook, coverSheet, 'Cover');

    const ratesSheet = XLSX.utils.aoa_to_sheet([
      ['Category', 'Description', 'Unit', 'BSR Rate (Nu.)'],
      ...baseRates.map((row) => [row.category, row.description, row.unit, row.bsrRate]),
    ]);
    XLSX.utils.book_append_sheet(workbook, ratesSheet, 'Basic Rates');

    const summaryRows = itemSummary.map((item) => {
      const calc = calculateItem(item);
      return [item.itemNo, item.description, item.unit, item.quantity, item.type, formatNu(calc.itemRate), formatNu(calc.totalA * item.quantity)];
    });
    const summarySheet = XLSX.utils.aoa_to_sheet([['Item No.', 'Description', 'Unit', 'Quantity', 'Type', 'Rate', 'Amount'], ...summaryRows]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'BOQ Summary');

    itemSummary.forEach((item) => {
      const calc = calculateItem(item);
      const rows = [
        ['BOQ Item Rate Analysis', item.description],
        ['Item No.', item.itemNo],
        ['Type', item.type],
        ['Unit', item.unit],
        ['Quantity', item.quantity],
        [],
        ['Section', 'Description', 'Unit', 'Coefficient', 'Rate (Nu.)', 'Amount (Nu.)'],
        ['Materials', '', '', '', '', formatNu(calc.materials)],
      ];
      item.materials.forEach((row) => rows.push(['Material', row.description, row.unit, row.coefficient, row.rate, row.coefficient * row.rate]));
      rows.push(['Labour', '', '', '', '', formatNu(calc.labour)]);
      item.labour.forEach((row) => rows.push(['Labour', row.category, row.unit || 'day', row.coefficient, row.rate, row.coefficient * row.rate]));
      rows.push(['Equipment', '', '', '', '', formatNu(calc.equipment)]);
      item.equipment.forEach((row) => rows.push(['Equipment', row.description, row.unit || 'hr', row.coefficient, row.rate, row.coefficient * row.rate]));
      rows.push(['Sundries', '', '', '', '', formatNu(calc.sundries)]);
      item.sundries.forEach((row) => rows.push(['Sundries', row.description, row.unit || '', row.coefficient, row.rate, row.coefficient * row.rate]));
      rows.push([], ['Total A', '', '', '', '', formatNu(calc.totalA)], ['Overhead 15%', '', '', '', '', formatNu(calc.totalB - calc.totalA)], ['Contingency 5%', '', '', '', '', formatNu(calc.totalC - calc.totalB)], ['Item Rate', '', '', '', '', formatNu(calc.itemRate)]);
      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, `Rate-${item.itemNo}`);
    });

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'druk-rate-analysis.xlsx');
  };

  return (
    <div className="app-shell">
      <div className="container">
        <header className="header">
          <h1>Druk Rate Analysis</h1>
          <p>Bhutan Schedule of Rates (BSR) compliant BOQ rate analysis for MoWHS tender preparation.</p>
        </header>
        <div className="toolbar">
          <div className="field">
            <label>Base Town</label>
            <select value={selectedTown} onChange={(e) => setSelectedTown(e.target.value)}>
              {dzongkhags.map((town) => <option key={town} value={town}>{town}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fiscal Year</label>
            <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
              {fiscalYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Overhead %</label>
            <input type="number" value={items[0]?.overhead || 15} onChange={(e) => updateItem(activeItem?.id, { overhead: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>Contingency %</label>
            <input type="number" value={items[0]?.contingency || 5} onChange={(e) => updateItem(activeItem?.id, { contingency: Number(e.target.value) })} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn btn-primary" onClick={exportWorkbook}>Export Excel</button>
          </div>
        </div>
        <div className="content">
          <div className="kpis">
            <div className="card"><strong>Selected Town</strong><div>{selectedTown}</div></div>
            <div className="card"><strong>Fiscal Year</strong><div>{fiscalYear}</div></div>
            <div className="card"><strong>BOQ Items</strong><div>{items.length}</div></div>
            <div className="card"><strong>Grand Total</strong><div>{formatNu(itemSummary.reduce((sum, item) => sum + calculateItem(item).itemRate * item.quantity, 0))}</div></div>
          </div>
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>BOQ Items</button>
            <button className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>Basic Rates</button>
            <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Abstract Sheet</button>
            <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>Market Comparison</button>
          </div>

          {activeTab === 'items' && (
            <div className="grid grid-2">
              <div className="panel">
                <div className="section-title">
                  <h3>BOQ Items</h3>
                  <button className="btn btn-primary" onClick={addItem}>Add Item</button>
                </div>
                <table className="table">
                  <thead>
                    <tr><th>Item No.</th><th>Description</th><th>Type</th><th>Rate</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} onClick={() => setActiveItemId(item.id)} style={{ cursor: 'pointer' }}>
                        <td>{item.itemNo}</td>
                        <td>{item.description}</td>
                        <td>{item.type}</td>
                        <td>{formatNu(calculateItem(item).itemRate)}</td>
                        <td>
                          <div className="actions">
                            <button className="btn btn-secondary" onClick={() => duplicateItem(item.id)}>Copy</button>
                            <button className="btn btn-danger" onClick={() => removeItem(item.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel">
                {activeItem ? (
                  <>
                    <div className="section-title">
                      <h3>{activeItem.description || 'Rate Analysis Worksheet'}</h3>
                      <span className="badge">BSR Table 5.1 Format</span>
                    </div>
                    <div className="grid grid-2">
                      <div className="field">
                        <label>Item No.</label>
                        <input value={activeItem.itemNo} onChange={(e) => updateItem(activeItem.id, { itemNo: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Type</label>
                        <select value={activeItem.type} onChange={(e) => updateItem(activeItem.id, { type: e.target.value })}>
                          <option value="BSR">BSR</option>
                          <option value="NA">NA – Non-Analysis</option>
                          <option value="AR">AR – Actual Rate</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <input value={activeItem.description} onChange={(e) => updateItem(activeItem.id, { description: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Unit</label>
                        <input value={activeItem.unit} onChange={(e) => updateItem(activeItem.id, { unit: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Quantity</label>
                        <input type="number" value={activeItem.quantity} onChange={(e) => updateItem(activeItem.id, { quantity: Number(e.target.value) })} />
                      </div>
                      <div className="field">
                        <label>Notes</label>
                        <input value={activeItem.notes} onChange={(e) => updateItem(activeItem.id, { notes: e.target.value })} />
                      </div>
                    </div>
                    <h4>Materials</h4>
                    <table className="table">
                      <thead><tr><th>Description</th><th>Unit</th><th>Coeff.</th><th>Rate</th><th>Amount</th><th>Actions</th></tr></thead>
                      <tbody>
                        {activeItem.materials.map((row) => (
                          <tr key={row.id}>
                            <td><input value={row.description} onChange={(e) => updateSectionRows('materials', activeItem.id, { id: row.id, description: e.target.value })} /></td>
                            <td><input value={row.unit} onChange={(e) => updateSectionRows('materials', activeItem.id, { id: row.id, unit: e.target.value })} /></td>
                            <td><input type="number" value={row.coefficient} onChange={(e) => updateSectionRows('materials', activeItem.id, { id: row.id, coefficient: Number(e.target.value) })} /></td>
                            <td><input type="number" value={row.rate} onChange={(e) => updateSectionRows('materials', activeItem.id, { id: row.id, rate: Number(e.target.value) })} /></td>
                            <td>{formatNu(Number(row.coefficient || 0) * Number(row.rate || 0))}</td>
                            <td><button className="btn btn-danger" onClick={() => updateItem(activeItem.id, { materials: activeItem.materials.filter((entry) => entry.id !== row.id) })}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="inline" style={{ marginTop: 8 }}>
                      <input placeholder="Autocomplete BSR description" onKeyDown={(e) => { if (e.key === 'Enter') autoPopulate(activeItem.id, 'materials', e.target.value); }} />
                      <button className="btn btn-secondary" onClick={() => addRow(activeItem.id, 'materials')}>Add Material</button>
                    </div>
                    <h4>Labour</h4>
                    <table className="table"><thead><tr><th>Category</th><th>Coeff.</th><th>Rate</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{activeItem.labour.map((row) => <tr key={row.id}><td><input value={row.category} onChange={(e) => updateSectionRows('labour', activeItem.id, { id: row.id, category: e.target.value })} /></td><td><input type="number" value={row.coefficient} onChange={(e) => updateSectionRows('labour', activeItem.id, { id: row.id, coefficient: Number(e.target.value) })} /></td><td><input type="number" value={row.rate} onChange={(e) => updateSectionRows('labour', activeItem.id, { id: row.id, rate: Number(e.target.value) })} /></td><td>{formatNu(Number(row.coefficient || 0) * Number(row.rate || 0))}</td><td><button className="btn btn-danger" onClick={() => updateItem(activeItem.id, { labour: activeItem.labour.filter((entry) => entry.id !== row.id) })}>Remove</button></td></tr>)}</tbody></table>
                    <button className="btn btn-secondary" onClick={() => addRow(activeItem.id, 'labour')}>Add Labour</button>
                    <h4>Equipment</h4>
                    <table className="table"><thead><tr><th>Description</th><th>Coeff.</th><th>Rate</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{activeItem.equipment.map((row) => <tr key={row.id}><td><input value={row.description} onChange={(e) => updateSectionRows('equipment', activeItem.id, { id: row.id, description: e.target.value })} /></td><td><input type="number" value={row.coefficient} onChange={(e) => updateSectionRows('equipment', activeItem.id, { id: row.id, coefficient: Number(e.target.value) })} /></td><td><input type="number" value={row.rate} onChange={(e) => updateSectionRows('equipment', activeItem.id, { id: row.id, rate: Number(e.target.value) })} /></td><td>{formatNu(Number(row.coefficient || 0) * Number(row.rate || 0))}</td><td><button className="btn btn-danger" onClick={() => updateItem(activeItem.id, { equipment: activeItem.equipment.filter((entry) => entry.id !== row.id) })}>Remove</button></td></tr>)}</tbody></table>
                    <button className="btn btn-secondary" onClick={() => addRow(activeItem.id, 'equipment')}>Add Equipment</button>
                    <h4>Sundries</h4>
                    <table className="table"><thead><tr><th>Description</th><th>Coeff.</th><th>Rate</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{activeItem.sundries.map((row) => <tr key={row.id}><td><input value={row.description} onChange={(e) => updateSectionRows('sundries', activeItem.id, { id: row.id, description: e.target.value })} /></td><td><input type="number" value={row.coefficient} onChange={(e) => updateSectionRows('sundries', activeItem.id, { id: row.id, coefficient: Number(e.target.value) })} /></td><td><input type="number" value={row.rate} onChange={(e) => updateSectionRows('sundries', activeItem.id, { id: row.id, rate: Number(e.target.value) })} /></td><td>{formatNu(Number(row.coefficient || 0) * Number(row.rate || 0))}</td><td><button className="btn btn-danger" onClick={() => updateItem(activeItem.id, { sundries: activeItem.sundries.filter((entry) => entry.id !== row.id) })}>Remove</button></td></tr>)}</tbody></table>
                    <button className="btn btn-secondary" onClick={() => addRow(activeItem.id, 'sundries')}>Add Sundry</button>
                    <div className="summary-grid" style={{ marginTop: 16 }}>
                      <div className="card">
                        <h4>Markup Breakdown</h4>
                        <div>Total A: {formatNu(calculateItem(activeItem).totalA)}</div>
                        <div>Total B: {formatNu(calculateItem(activeItem).totalB)}</div>
                        <div>Total C: {formatNu(calculateItem(activeItem).totalC)}</div>
                        <div>Item Rate: {formatNu(calculateItem(activeItem).itemRate)}</div>
                      </div>
                      <div className="card">
                        <h4>Reference</h4>
                        <div className="small">Location premium applied to remote dzongkhags using {selectedTown} as base.</div>
                      </div>
                    </div>
                  </>
                ) : <p>No item selected.</p>}
              </div>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="panel">
              <div className="section-title"><h3>Basic Rates Reference</h3><span className="badge">Autocomplete-ready</span></div>
              <table className="table">
                <thead><tr><th>Category</th><th>Description</th><th>Unit</th><th>BSR Rate</th><th>Apply to Active Item</th></tr></thead>
                <tbody>
                  {baseRates.map((row) => (
                    <tr key={row.id}>
                      <td>{row.category}</td>
                      <td>{row.description}</td>
                      <td>{row.unit}</td>
                      <td>{formatNu(row.bsrRate)}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-primary" onClick={() => applyBaseRate(row, 'materials')}>Materials</button>
                          <button className="btn btn-secondary" onClick={() => applyBaseRate(row, 'labour')}>Labour</button>
                          <button className="btn btn-secondary" onClick={() => applyBaseRate(row, 'equipment')}>Equipment</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="panel">
              <div className="section-title"><h3>Abstract Sheet</h3><span className="badge">Summarized Rates</span></div>
              <table className="table">
                <thead><tr><th>Item No.</th><th>Description</th><th>Unit</th><th>Qty</th><th>Type</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>{itemSummary.map((item) => <tr key={item.id}><td>{item.itemNo}</td><td>{item.description}</td><td>{item.unit}</td><td>{item.quantity}</td><td>{item.type}</td><td>{formatNu(calculateItem(item).itemRate)}</td><td>{formatNu(calculateItem(item).itemRate * item.quantity)}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {activeTab === 'market' && (
            <div className="panel">
              <div className="section-title"><h3>Rate vs Current Market Comparison</h3><span className="badge">Audit-ready</span></div>
              <table className="table">
                <thead><tr><th>Line Item</th><th>BSR Rate</th><th>Market Rate</th><th>Variance</th><th>Source / Date</th><th>Action</th></tr></thead>
                <tbody>
                  {baseRates.map((row) => {
                    const key = `${row.description}-${row.category}`;
                    const cache = marketCache[key];
                    const overrideValue = marketOverrides[key];
                    const effectiveRate = overrideValue ?? cache?.rate ?? row.bsrRate;
                    const variance = effectiveRate - row.bsrRate;
                    const variancePct = row.bsrRate ? (variance / row.bsrRate) * 100 : 0;
                    return (
                      <tr key={row.id}>
                        <td>{row.description}</td>
                        <td>{formatNu(row.bsrRate)}</td>
                        <td>
                          <input
                            type="number"
                            value={effectiveRate}
                            onChange={(e) => setMarketOverrides((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>{`${formatNu(variance)} (${variancePct.toFixed(1)}%)`}</td>
                        <td>{cache ? `${cache.source} / ${cache.date}` : 'Market rate unavailable — using BSR'}</td>
                        <td>
                          <div className="actions">
                            <button className="btn btn-secondary" onClick={() => refreshMarketRate(row.description, row.category)}>Refresh</button>
                            <button className="btn btn-danger" onClick={() => setMarketOverrides((prev) => ({ ...prev, [key]: undefined }))}>Reset</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
