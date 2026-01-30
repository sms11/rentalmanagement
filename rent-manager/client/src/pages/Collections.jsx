import { useState, useEffect } from 'react';
import { collectionsAPI, tenantsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

const formatCurrency = (value) => `NPR ${value?.toLocaleString() || 0}`;

const statusColors = {
  PENDING: 'badge-warning',
  PAID: 'badge-success',
  OVERDUE: 'badge-danger',
  PARTIAL: 'badge-info'
};

export default function Collections() {
  const { isAdmin } = useAuth();
  const [collections, setCollections] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    status: ''
  });

  const [formData, setFormData] = useState({
    tenantId: '',
    dueDate: '',
    amount: '',
    assignedToId: '',
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    paidAmount: '',
    paymentMethod: '',
    notes: ''
  });

  useEffect(() => {
    fetchCollections();
  }, [filters]);

  useEffect(() => {
    fetchMetaData();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await collectionsAPI.getAll(filters);
      setCollections(response.data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetaData = async () => {
    try {
      const [tenantsRes, staffRes] = await Promise.all([
        tenantsAPI.getAll({ active: 'true' }),
        usersAPI.getStaff()
      ]);
      setTenants(tenantsRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  const openAddModal = () => {
    setFormData({
      tenantId: '',
      dueDate: '',
      amount: '',
      assignedToId: '',
      notes: ''
    });
    setModalOpen(true);
  };

  const openPaymentModal = (collection) => {
    setSelectedCollection(collection);
    setPaymentData({
      paidAmount: collection.amount - collection.paidAmount,
      paymentMethod: '',
      notes: ''
    });
    setPaymentModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await collectionsAPI.create(formData);
      setModalOpen(false);
      fetchCollections();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await collectionsAPI.recordPayment(selectedCollection.id, paymentData);
      setPaymentModalOpen(false);
      fetchCollections();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (collectionId, assignedToId) => {
    try {
      await collectionsAPI.update(collectionId, { assignedToId });
      fetchCollections();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to assign collection');
    }
  };

  const handleGenerateMonthly = async () => {
    if (!confirm(`Generate rent collections for all active tenants for ${filters.month}/${filters.year}?`)) return;

    try {
      const response = await collectionsAPI.generate({ year: filters.year, month: filters.month });
      alert(response.data.message);
      fetchCollections();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate collections');
    }
  };

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      const dueDate = new Date(filters.year, filters.month - 1, tenant.rentDueDay);
      setFormData({
        ...formData,
        tenantId,
        amount: tenant.rentAmount,
        dueDate: dueDate.toISOString().split('T')[0]
      });
    }
  };

  const columns = [
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
      header: 'Due Date',
      render: (row) => new Date(row.dueDate).toLocaleDateString()
    },
    {
      header: 'Amount',
      render: (row) => (
        <div>
          <p>{formatCurrency(row.amount)}</p>
          {row.lateFee > 0 && (
            <p className="text-sm text-red-500">+{formatCurrency(row.lateFee)} late fee</p>
          )}
        </div>
      )
    },
    {
      header: 'Paid',
      render: (row) => (
        <div>
          <p>{formatCurrency(row.paidAmount)}</p>
          {row.paidDate && (
            <p className="text-sm text-gray-500">{new Date(row.paidDate).toLocaleDateString()}</p>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${statusColors[row.status]}`}>{row.status}</span>
      )
    },
    {
      header: 'Assigned To',
      render: (row) => (
        <select
          value={row.assignedToId || ''}
          onChange={(e) => handleAssign(row.id, e.target.value || null)}
          className="input py-1 text-sm"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status !== 'PAID' && (
            <button
              onClick={() => openPaymentModal(row)}
              className="btn btn-success text-xs py-1 px-2"
            >
              Record Payment
            </button>
          )}
        </div>
      )
    }
  ];

  const months = [
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
        <h1 className="text-2xl font-bold text-gray-900">Rent Collections</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
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
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-auto"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIAL">Partial</option>
          </select>
          {isAdmin && (
            <>
              <button onClick={handleGenerateMonthly} className="btn btn-secondary">
                Generate Monthly
              </button>
              <button onClick={openAddModal} className="btn btn-primary">
                Add Collection
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={collections}
          loading={loading}
          emptyMessage="No collections found"
        />
      </div>

      {/* Add Collection Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Collection">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tenant *</label>
            <select
              className="input"
              value={formData.tenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              required
            >
              <option value="">Select Tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} - {t.property?.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date *</label>
              <input
                type="date"
                className="input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Amount (NPR) *</label>
              <input
                type="number"
                className="input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select
              className="input"
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record Payment">
        <form onSubmit={handlePayment} className="space-y-4">
          {selectedCollection && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="font-medium">{selectedCollection.tenant?.name}</p>
              <p className="text-sm text-gray-500">
                Due: {formatCurrency(selectedCollection.amount + selectedCollection.lateFee)}
              </p>
              <p className="text-sm text-gray-500">
                Already Paid: {formatCurrency(selectedCollection.paidAmount)}
              </p>
              <p className="text-sm font-medium text-primary-600">
                Remaining: {formatCurrency(selectedCollection.amount + selectedCollection.lateFee - selectedCollection.paidAmount)}
              </p>
            </div>
          )}
          <div>
            <label className="label">Payment Amount (NPR) *</label>
            <input
              type="number"
              className="input"
              value={paymentData.paidAmount}
              onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
              required
              min="1"
            />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              className="input"
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
            >
              <option value="">Select Method</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="Mobile Payment">Mobile Payment</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setPaymentModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
