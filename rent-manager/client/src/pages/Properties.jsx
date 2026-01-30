import { useState, useEffect } from 'react';
import { propertiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

export default function Properties() {
  const { isAdmin } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name,
        address: property.address,
        description: property.description || ''
      });
    } else {
      setEditingProperty(null);
      setFormData({ name: '', address: '', description: '' });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProperty(null);
    setFormData({ name: '', address: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingProperty) {
        await propertiesAPI.update(editingProperty.id, formData);
      } else {
        await propertiesAPI.create(formData);
      }
      closeModal();
      fetchProperties();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      await propertiesAPI.delete(id);
      fetchProperties();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete property');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Address', accessor: 'address' },
    {
      header: 'Tenants',
      render: (row) => (
        <span className="badge badge-info">{row.tenantCount} tenants</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        {isAdmin && (
          <button onClick={() => openModal()} className="btn btn-primary">
            Add Property
          </button>
        )}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={properties}
          loading={loading}
          emptyMessage="No properties found"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingProperty ? 'Edit Property' : 'Add Property'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Property Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              type="text"
              className="input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
