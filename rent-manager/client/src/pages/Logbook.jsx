import { useState, useEffect } from 'react';
import { collectionsAPI, propertiesAPI } from '../services/api';
import DataTable from '../components/DataTable';

const formatCurrency = (value) => `NPR ${value?.toLocaleString() || 0}`;

const statusColors = {
  PENDING: 'badge-warning',
  PAID: 'badge-success',
  OVERDUE: 'badge-danger',
  PARTIAL: 'badge-info'
};

export default function Logbook() {
  const [collections, setCollections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    propertyId: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [filters]);

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = { year: filters.year };
      if (filters.month) params.month = filters.month;

      const response = await collectionsAPI.getAll(params);
      let data = response.data;

      if (filters.propertyId) {
        data = data.filter(c => c.tenant?.propertyId === filters.propertyId);
      }

      setCollections(data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalExpected = collections.reduce((sum, c) => sum + c.amount + c.lateFee, 0);
    const totalCollected = collections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalRemaining = totalExpected - totalCollected;

    return { totalExpected, totalCollected, totalRemaining };
  };

  const summary = calculateSummary();

  const columns = [
    {
      header: 'Date',
      render: (row) => new Date(row.dueDate).toLocaleDateString()
    },
    {
      header: 'Tenant',
      render: (row) => (
        <div>
          <p className="font-medium">{row.tenant?.name}</p>
          <p className="text-sm text-gray-500">{row.tenant?.property?.name}</p>
        </div>
      )
    },
    {
      header: 'Rent Due',
      render: (row) => formatCurrency(row.amount)
    },
    {
      header: 'Late Fee',
      render: (row) => row.lateFee > 0 ? formatCurrency(row.lateFee) : '-'
    },
    {
      header: 'Total Due',
      render: (row) => formatCurrency(row.amount + row.lateFee)
    },
    {
      header: 'Paid',
      render: (row) => (
        <span className={row.paidAmount > 0 ? 'text-green-600 font-medium' : ''}>
          {formatCurrency(row.paidAmount)}
        </span>
      )
    },
    {
      header: 'Balance',
      render: (row) => {
        const balance = row.amount + row.lateFee - row.paidAmount;
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            {formatCurrency(balance)}
          </span>
        );
      }
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${statusColors[row.status]}`}>{row.status}</span>
      )
    },
    {
      header: 'Payment Date',
      render: (row) => row.paidDate ? new Date(row.paidDate).toLocaleDateString() : '-'
    },
    {
      header: 'Method',
      render: (row) => row.paymentMethod || '-'
    }
  ];

  const months = [
    { value: '', label: 'All Months' },
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Logbook</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.propertyId}
            onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
            className="input w-auto"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="input w-auto"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            className="input w-auto"
          >
            {[...Array(5)].map((_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-600">Total Expected</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(summary.totalExpected)}</p>
        </div>
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-600">Total Collected</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(summary.totalCollected)}</p>
        </div>
        <div className="card bg-red-50 border-red-200">
          <p className="text-sm font-medium text-red-600">Total Remaining</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(summary.totalRemaining)}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        <DataTable
          columns={columns}
          data={collections}
          loading={loading}
          emptyMessage="No transactions found"
        />
      </div>
    </div>
  );
}
