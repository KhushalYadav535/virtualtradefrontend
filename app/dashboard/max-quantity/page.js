'use client';
import { AlertTriangle, Info } from 'lucide-react';

export default function MaxQuantityPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-groww-ink">Max Quantity Details</h1>
        <p className="text-groww-muted">Maximum order quantity limits per transaction as per exchange rules</p>
      </div>
      
      <div className="bg-white rounded-xl border border-groww-border p-6 shadow-sm">
        <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900">Exchange Freeze Quantities</h3>
            <p className="text-blue-800 text-sm mt-1">
              To maintain market stability, exchanges enforce a maximum quantity per order (freeze quantity). 
              If you wish to trade more than these limits, you must split your trade into multiple orders.
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4 text-sm font-semibold text-gray-500">Segment / Index</th>
                <th className="py-3 px-4 text-sm font-semibold text-gray-500">Max Quantity per Order</th>
                <th className="py-3 px-4 text-sm font-semibold text-gray-500">Equivalent Lots (approx)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">Equity Delivery (CNC)</td>
                <td className="py-4 px-4 text-gray-600">Based on Market Depth / Capital</td>
                <td className="py-4 px-4 text-gray-500">-</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">Equity Intraday (MIS)</td>
                <td className="py-4 px-4 text-gray-600">100,000 shares</td>
                <td className="py-4 px-4 text-gray-500">-</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">NIFTY 50 Options</td>
                <td className="py-4 px-4 text-gray-600">1,800 units</td>
                <td className="py-4 px-4 text-gray-500">72 Lots (25 qty/lot)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">BANKNIFTY Options</td>
                <td className="py-4 px-4 text-gray-600">900 units</td>
                <td className="py-4 px-4 text-gray-500">60 Lots (15 qty/lot)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">FINNIFTY Options</td>
                <td className="py-4 px-4 text-gray-600">1,800 units</td>
                <td className="py-4 px-4 text-gray-500">45 Lots (40 qty/lot)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">MIDCPNIFTY Options</td>
                <td className="py-4 px-4 text-gray-600">4,200 units</td>
                <td className="py-4 px-4 text-gray-500">56 Lots (75 qty/lot)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-800">Stock Options</td>
                <td className="py-4 px-4 text-gray-600">Varies per stock</td>
                <td className="py-4 px-4 text-gray-500">~10-20 Lots</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
