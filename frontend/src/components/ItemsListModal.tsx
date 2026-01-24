import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import type { Report } from '../types/report';
import type { Claim } from '../types/claim';

interface ItemsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: (Report | Claim)[];
  type: 'reports' | 'claims';
}

export default function ItemsListModal({ isOpen, onClose, title, items, type }: ItemsListModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const generateReceipt = (item: Report | Claim) => {
    const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${type === 'reports' ? 'Item Report' : 'Item Claim'}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #29b6f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #29b6f6;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .receipt-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .receipt-info h2 {
      margin-top: 0;
      color: #29b6f6;
      font-size: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ddd;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 2px solid #eee;
      padding-top: 20px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-verified { background: #d1ecf1; color: #0c5460; }
    .status-claimed { background: #d4edda; color: #155724; }
    .status-rejected { background: #f8d7da; color: #721c24; }
    .status-approved { background: #d1ecf1; color: #0c5460; }
  </style>
</head>
<body>
  <div class="header">
    <h1>uLost iFound</h1>
    <p>Official Receipt</p>
    <p style="font-size: 12px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="receipt-info">
    <h2>${type === 'reports' ? 'Item Report Details' : 'Item Claim Details'}</h2>
    ${type === 'reports' ? `
      <div class="info-row">
        <span class="label">Item Name:</span>
        <span class="value">${(item as Report).itemName}</span>
      </div>
      <div class="info-row">
        <span class="label">Type:</span>
        <span class="value">${(item as Report).type}</span>
      </div>
      <div class="info-row">
        <span class="label">Category:</span>
        <span class="value">${(item as Report).category}</span>
      </div>
      <div class="info-row">
        <span class="label">Location:</span>
        <span class="value">${(item as Report).location}</span>
      </div>
      <div class="info-row">
        <span class="label">Date ${(item as Report).type === 'Lost' ? 'Lost' : 'Found'}:</span>
        <span class="value">${formatDate((item as Report).date)}</span>
      </div>
      <div class="info-row">
        <span class="label">Date Reported:</span>
        <span class="value">${formatDate((item as Report).date)}</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value"><span class="status status-${(item as Report).status.toLowerCase()}">${(item as Report).status}</span></span>
      </div>
      <div class="info-row">
        <span class="label">Description:</span>
        <span class="value">${(item as Report).description}</span>
      </div>
    ` : `
      <div class="info-row">
        <span class="label">Item Name:</span>
        <span class="value">${(item as Claim).itemName}</span>
      </div>
      <div class="info-row">
        <span class="label">Claimant:</span>
        <span class="value">${(item as Claim).claimantName}</span>
      </div>
      <div class="info-row">
        <span class="label">Claimant Role:</span>
        <span class="value">${(item as Claim).claimantRole}</span>
      </div>
      <div class="info-row">
        <span class="label">Date Claimed:</span>
        <span class="value">${formatDate((item as Claim).date)}</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value"><span class="status status-${(item as Claim).status.toLowerCase()}">${(item as Claim).status}</span></span>
      </div>
      <div class="info-row">
        <span class="label">Proof Description:</span>
        <span class="value">${(item as Claim).proofDescription}</span>
      </div>
    `}
  </div>

  <div class="footer">
    <p>This is an official receipt from uLost iFound system.</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Receipt ID: ${type === 'reports' ? `RPT-${(item as Report).id}` : `CLM-${(item as Claim).id}`}</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type === 'reports' ? 'Report' : 'Claim'}_${type === 'reports' ? (item as Report).id : (item as Claim).id}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className={`p-4 flex justify-between items-center text-white ${title.includes('Reported') ? 'bg-[#b3e5fc]' : 'bg-[#c8e6c9]'}`}>
          <div className="flex items-center gap-2">
            <FileText className={`w-5 h-5 ${title.includes('Reported') ? 'text-[#01579b]' : 'text-[#1b5e20]'}`} />
            <h3 className={`font-bold ${title.includes('Reported') ? 'text-[#01579b]' : 'text-[#1b5e20]'}`}>{title}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${title.includes('Reported') ? 'bg-[#01579b] text-white' : 'bg-[#1b5e20] text-white'}`}>
              {items.length}
            </span>
          </div>
          <button onClick={onClose} className={`hover:bg-white/20 p-1 rounded transition-colors ${title.includes('Reported') ? 'text-[#01579b]' : 'text-[#1b5e20]'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No items found.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">
                      {type === 'reports' ? (item as Report).itemName : (item as Claim).itemName}
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      {type === 'reports' ? (
                        <>
                          <p><span className="font-medium">Type:</span> {(item as Report).type}</p>
                          <p><span className="font-medium">Category:</span> {(item as Report).category}</p>
                          <p><span className="font-medium">Date:</span> {formatDate((item as Report).date)}</p>
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              (item as Report).status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              (item as Report).status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                              (item as Report).status === 'Claimed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(item as Report).status}
                            </span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium">Claimant:</span> {(item as Claim).claimantName}</p>
                          <p><span className="font-medium">Date:</span> {formatDate((item as Claim).date)}</p>
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              (item as Claim).status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              (item as Claim).status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                              (item as Claim).status === 'Claimed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(item as Claim).status}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => generateReceipt(item)}
                    className="ml-4 p-2 bg-[#29b6f6] text-white rounded-lg hover:bg-[#0288d1] transition-colors flex items-center gap-2 text-xs font-medium"
                    title="Download Receipt"
                  >
                    <Download className="w-4 h-4" />
                    Receipt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
