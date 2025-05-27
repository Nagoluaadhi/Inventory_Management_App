import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import BarcodeScanner from './BarcodeScanner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function StockIn() {
  const [form, setForm] = useState({
    date: '',
    inventory_id: '',
    client_id: '',
    barcode: '',
    invoice_no: '',
    qty: '',
    remark: ''
  });

  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [data, setData] = useState([]);
  const [scannerVisible, setScannerVisible] = useState(false);
  const scanRef = useRef(null);
  const scanned = useRef({ barcode: '', qty: '' });

  const user = JSON.parse(localStorage.getItem('user'));

  const loadDropdowns = async () => {
    try {
      const [invRes, cliRes, stockRes] = await Promise.all([
        axios.get('/api/inventory'),
        axios.get('/api/clients'),
        axios.get('/api/stock/stockin')
      ]);
      setInventory(invRes.data);
      setClients(cliRes.data);
      setData(stockRes.data);
    } catch (err) {
      console.error('Dropdown loading failed:', err);
    }
  };

  useEffect(() => {
    loadDropdowns();
    scanRef.current?.focus();
  }, []);

  const handleScanInput = (e) => {
    const value = e.target.value.trim();
    if (!value) return;

    setForm(prev => {
      if (prev.barcode === value) {
        const newQty = (parseInt(prev.qty || '0', 10) + 1).toString();
        scanned.current = { barcode: value, qty: newQty };
        return { ...prev, qty: newQty };
      } else {
        scanned.current = { barcode: value, qty: '1' };
        return { ...prev, barcode: value, qty: '1' };
      }
    });

    e.target.value = '';
    setTimeout(() => scanRef.current?.focus(), 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert('User not logged in.');
      return;
    }

    const finalForm = {
      ...form,
      barcode: form.barcode || scanned.current.barcode,
      qty: form.qty || scanned.current.qty
    };

    if (!form.date || !form.inventory_id || !form.client_id || !finalForm.barcode || !finalForm.qty) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      await axios.post('/api/stock/stockin', {
        ...finalForm,
        user_id: user.id
      });

      setForm({
        date: '',
        inventory_id: '',
        client_id: '',
        barcode: '',
        invoice_no: '',
        qty: '',
        remark: ''
      });

      scanned.current = { barcode: '', qty: '' };
      loadDropdowns();
      scanRef.current?.focus();
    } catch (err) {
      console.error('StockIn submission failed:', err);
      alert('Error submitting Stock IN. Please check the server and try again.');
    }
  };

  const deleteStockIn = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) return;
    try {
      await axios.delete(`/api/stock/stockin/${id}`);
      loadDropdowns();
    } catch (err) {
      console.error(err);
      alert('Failed to delete stock entry');
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StockIn');
    XLSX.writeFile(wb, 'stockin.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['S.No', 'Item', 'Client', 'Barcode', 'Invoice', 'Qty', 'Remark', 'Date']],
      body: data.map((row, i) => [
        i + 1,
        row.item_name,
        row.client_name,
        row.barcode,
        row.invoice_no,
        row.qty,
        row.remark,
        new Date(row.date).toLocaleDateString()
      ])
    });
    doc.save('stockin.pdf');
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Stock In</h2>

      <input
        ref={scanRef}
        onInput={handleScanInput}
        className="absolute opacity-0 pointer-events-none"
        autoFocus
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="p-2 border rounded" />

        <select value={form.inventory_id} onChange={(e) => setForm({ ...form, inventory_id: e.target.value })} className="p-2 border rounded">
          <option value="">Select Item</option>
          {inventory.map(item => <option key={item.id} value={item.id}>{item.item_name}</option>)}
        </select>

        <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="p-2 border rounded">
          <option value="">Select Client</option>
          {clients.map(cli => <option key={cli.id} value={cli.id}>{cli.client_name}</option>)}
        </select>

        <input type="text" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="p-2 border rounded" />
        <input type="text" placeholder="Invoice No" value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} className="p-2 border rounded" />
        <input type="number" placeholder="Quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="p-2 border rounded" />
        <input type="text" placeholder="Remark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} className="p-2 border rounded md:col-span-2" />

        <div className="md:col-span-3 flex justify-end">
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded w-auto">Add Stock</button>
        </div>
      </form>

      <div className="flex gap-4 mb-4">
        <button onClick={exportExcel} className="bg-blue-600 text-white px-4 py-2 rounded">Export Excel</button>
        <button onClick={exportPDF} className="bg-red-600 text-white px-4 py-2 rounded">Export PDF</button>
        <button onClick={() => setScannerVisible(!scannerVisible)} className="bg-green-600 text-white px-4 py-2 rounded">
          {scannerVisible ? 'Hide Scanner' : 'Show Scanner'}
        </button>
      </div>

      {scannerVisible && (
        <div className="mb-4">
          <BarcodeScanner onDetected={(val) => setForm({ ...form, barcode: val, qty: '1' })} />
        </div>
      )}

      {form.barcode && form.qty && parseInt(form.qty) > 0 && (
        <div className="my-4">
          <h3 className="font-semibold mb-2">Barcode Preview</h3>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: parseInt(form.qty) }).map((_, i) => (
              <div key={i} className="border p-1 text-center">
                <Barcode value={form.barcode} width={1} height={50} displayValue={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-md font-semibold mb-2">Stock In History</h3>
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2">S.No</th>
            <th className="border px-2">Item</th>
            <th className="border px-2">Client</th>
            <th className="border px-2">Barcode</th>
            <th className="border px-2">Invoice</th>
            <th className="border px-2">Qty</th>
            <th className="border px-2">Remark</th>
            <th className="border px-2">Date</th>
            <th className="border px-2">Action</th>
          </tr>
        </thead>
        <tbody>
  {data.flatMap((row, i) => (
    Array.from({ length: parseInt(row.qty) }).map((_, j) => (
      <tr key={`${row.id}-${j}`}>
        <td className="border px-2">{i + 1}.{j + 1}</td>
        <td className="border px-2">{row.item_name}</td>
        <td className="border px-2">{row.client_name}</td>
        <td className="border px-2">{row.barcode}</td>
        <td className="border px-2">{row.invoice_no}</td>
        <td className="border px-2">1</td>
        <td className="border px-2">{row.remark}</td>
        <td className="border px-2">{new Date(row.date).toLocaleDateString()}</td>
        <td className="border px-2">
          <button
            onClick={() => deleteStockIn(row.id)}
            className="bg-red-600 text-white px-2 py-1 text-xs rounded"
          >
            Delete
          </button>
        </td>
      </tr>
    ))
  ))}
</tbody>

      </table>
    </div>
  );
}
