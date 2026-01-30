import { useState, useEffect } from 'react';
import { tenantsAPI, propertiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

const formatCurrency = (value) => `NPR ${value?.toLocaleString() || 0}`;

export default function Tenants() {
  const { isAdmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterProperty, setFilterProperty] = useState('');

  const initialFormData = {
    propertyId: '',
    name: '',
    email: '',
    phone: '',
    leaseStartDate: '',
    leaseEndDate: '',
    rentAmount: '',
    depositAmount: '',
    rentDueDay: 1,
    lateFeePercentage: 0,
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, [filterProperty]);

  const fetchData = async () => {
    try {
      const [tenantsRes, propertiesRes] = await Promise.all([
        tenantsAPI.getAll({ propertyId: filterProperty || undefined }),
        propertiesAPI.getAll()
      ]);
      setTenants(tenantsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        propertyId: tenant.propertyId,
        name: tenant.name,
        email: tenant.email || '',
        phone: tenant.phone || '',
        leaseStartDate: tenant.leaseStartDate?.split('T')[0] || '',
        leaseEndDate: tenant.leaseEndDate?.split('T')[0] || '',
        rentAmount: tenant.rentAmount,
        depositAmount: tenant.depositAmount || '',
        rentDueDay: tenant.rentDueDay,
        lateFeePercentage: tenant.lateFeePercentage || 0,
        notes: tenant.notes || ''
      });
    } else {
      setEditingTenant(null);
      setFormData(initialFormData);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTenant(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingTenant) {
        await tenantsAPI.update(editingTenant.id, formData);
      } else {
        await tenantsAPI.create(formData);
      }
      closeModal();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;

    try {
      await tenantsAPI.delete(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete tenant');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    {
      header: 'Property',
      render: (row) => row.property?.name
    },
    {
      header: 'Rent Amount',
      render: (row) => formatCurrency(row.rentAmount)
    },
    {
      header: 'Due Day',
      render: (row) => `${row.rentDueDay}${getOrdinalSuffix(row.rentDueDay)} of month`
    },
    {
      header: 'Contact',
      render: (row) => (
        <div>
          <p className="text-sm">{row.email || '-'}</p>
          <p className="text-sm text-gray-500">{row.phone || '-'}</p>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`badge ${row.isActive ? 'badge-success' : 'badge-danger'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => openModal(row)}
                className="text-primary-600 hover:text-primary-800"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(row.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="input w-auto"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {isAdmin && (
            <button onClick={() => openModal()} className="btn btn-primary">
              Add Tenant
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={tenants}
          loading={loading}
          emptyMessage="No tenants found"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTenant ? 'Edit Tenant' : 'Add Tenant'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Property *</label>
              <select
                className="input"
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                required
              >
                <option value="">Select Property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tenant Name *</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Rent Amount (NPR) *</label>
              <input
                type="number"
                className="input"
                value={formData.rentAmount}
                onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                required
                min="0"
              />
            </div>
            <div>
              <label className="label">Deposit Amount (NPR)</label>
              <input
                type="number"
                className="input"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                min="0"
              />
            </div>
            <div>
              <label className="label">Rent Due Day (1-31)</label>
              <input
                type="number"
                className="input"
                value={formData.rentDueDay}
                onChange={(e) => setFormData({ ...formData, rentDueDay: parseInt(e.target.value) })}
                min="1"
                max="31"
              />
            </div>
            <div>
              <label className="label">Late Fee (%)</label>
              <input
                type="number"
                className="input"
                value={formData.lateFeePercentage}
                onChange={(e) => setFormData({ ...formData, lateFeePercentage: parseFloat(e.target.value) })}
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="label">Lease Start Date</label>
              <input
                type="date"
                className="input"
                value={formData.leaseStartDate}
                onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Lease End Date</label>
              <input
                type="date"
                className="input"
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
