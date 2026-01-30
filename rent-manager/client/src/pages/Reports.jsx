import { useState, useEffect } from 'react';
import { reportsAPI, propertiesAPI } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value) => `NPR ${value?.toLocaleString() || 0}`;

export default function Reports() {
  const [reportType, setReportType] = useState('collections');
  const [data, setData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: '',
    propertyId: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, filters]);

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let response;
      const params = { year: filters.year };
      if (filters.month) params.month = filters.month;
      if (filters.propertyId) params.propertyId = filters.propertyId;

      switch (reportType) {
        case 'collections':
          response = await reportsAPI.getCollections(params);
          break;
        case 'tenants':
          response = await reportsAPI.getTenants(params);
          break;
        case 'properties':
          response = await reportsAPI.getProperties(params);
          break;
        default:
          response = await reportsAPI.getCollections(params);
      }
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('Rent Manager Report', pageWidth / 2, 20, { align: 'center' });

    // Report Info
    doc.setFontSize(12);
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 35);
    doc.text(`Period: ${filters.month ? `${filters.month}/` : ''}${filters.year}`, 14, 42);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 49);

    // Summary
    if (data?.summary) {
      doc.setFontSize(14);
      doc.text('Summary', 14, 62);

      const summaryData = [
        ['Total Expected', formatCurrency(data.summary.totalExpected)],
        ['Total Collected', formatCurrency(data.summary.totalPaid || data.summary.totalCollected)],
        ['Total Remaining', formatCurrency(data.summary.totalBalance || data.summary.totalRemaining)]
      ];

      autoTable(doc, {
        startY: 67,
        head: [['Metric', 'Amount']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [2, 132, 199] }
      });
    }

    // Detail Table
    let tableData = [];
    let tableHeaders = [];

    if (reportType === 'collections' && data?.collections) {
      tableHeaders = ['Tenant', 'Property', 'Due Date', 'Amount', 'Paid', 'Status'];
      tableData = data.collections.map(c => [
        c.tenant?.name,
        c.tenant?.property?.name,
        new Date(c.dueDate).toLocaleDateString(),
        formatCurrency(c.amount),
        formatCurrency(c.paidAmount),
        c.status
      ]);
    } else if (reportType === 'tenants' && data?.tenants) {
      tableHeaders = ['Tenant', 'Property', 'Expected', 'Paid', 'Balance'];
      tableData = data.tenants.map(t => [
        t.tenant?.name,
        t.property?.name,
        formatCurrency(t.totalExpected),
        formatCurrency(t.totalPaid),
        formatCurrency(t.balance)
      ]);
    } else if (reportType === 'properties' && data?.properties) {
      tableHeaders = ['Property', 'Tenants', 'Expected', 'Collected', 'Rate'];
      tableData = data.properties.map(p => [
        p.property?.name,
        p.tenantCount,
        formatCurrency(p.totalExpected),
        formatCurrency(p.totalPaid),
        `${p.collectionRate}%`
      ]);
    }

    if (tableData.length > 0) {
      const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 100;
      doc.setFontSize(14);
      doc.text('Details', 14, startY);

      autoTable(doc, {
        startY: startY + 5,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199] }
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`rent-report-${reportType}-${filters.year}${filters.month ? '-' + filters.month : ''}.pdf`);
  };

  const months = [
    { value: '', label: 'Full Year' },
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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={generatePDF} className="btn btn-primary" disabled={loading || !data}>
          Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="label">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input w-auto"
            >
              <option value="collections">Collections Report</option>
              <option value="tenants">Tenant Report</option>
              <option value="properties">Property Report</option>
            </select>
          </div>
          <div>
            <label className="label">Year</label>
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
          <div>
            <label className="label">Month</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="input w-auto"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          {reportType !== 'properties' && (
            <div>
              <label className="label">Property</label>
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
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card bg-blue-50 border-blue-200">
              <p className="text-sm font-medium text-blue-600">
                {reportType === 'properties' ? 'Properties' : reportType === 'tenants' ? 'Tenants' : 'Records'}
              </p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {data.summary?.totalProperties || data.summary?.totalTenants || data.summary?.totalRecords || 0}
              </p>
            </div>
            <div className="card bg-green-50 border-green-200">
              <p className="text-sm font-medium text-green-600">Total Expected</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(data.summary?.totalExpected)}
              </p>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <p className="text-sm font-medium text-yellow-600">Total Collected</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {formatCurrency(data.summary?.totalPaid || data.summary?.totalCollected)}
              </p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <p className="text-sm font-medium text-red-600">Balance</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {formatCurrency(data.summary?.totalBalance || data.summary?.totalRemaining)}
              </p>
            </div>
          </div>

          {/* Data Table */}
          <div className="card overflow-x-auto">
            {reportType === 'collections' && data.collections && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.collections.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{c.tenant?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{c.tenant?.property?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(c.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(c.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(c.paidAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${c.status === 'PAID' ? 'badge-success' : c.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'tenants' && data.tenants && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.tenants.map((t, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap">{t.tenant?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{t.property?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(t.tenant?.rentAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(t.totalExpected)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">{formatCurrency(t.totalPaid)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-600">{formatCurrency(t.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'properties' && data.properties && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenants</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.properties.map((p, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{p.property?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.property?.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{p.tenantCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(p.totalExpected)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">{formatCurrency(p.totalPaid)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${p.collectionRate >= 80 ? 'badge-success' : p.collectionRate >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {p.collectionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="card text-center py-12 text-gray-500">
          No data available for the selected filters
        </div>
      )}
    </div>
  );
}
