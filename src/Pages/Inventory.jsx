


import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import './Inventory.css';

const Inventory = () => {
 
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'DELIVERED' | 'PENDING'

  
  const getRandomFutureTimestamp = (baseTime, minDays, maxDays) => {
    // baseTime is a number (milliseconds since 1970)
    const minOffset = minDays * 24 * 60 * 60 * 1000; // e.g. 1 day in ms
    const maxOffset = maxDays * 24 * 60 * 60 * 1000; // e.g. 7 days in ms
    const randomOffset =
      Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
    return baseTime + randomOffset;
  };

 
  useEffect(() => {
    
    const storedOrders = JSON.parse(localStorage.getItem('inventoryOrders')) || [];

   
    const params = new URLSearchParams(window.location.search);
    const name         = params.get('name') || '';
    const address      = params.get('address') || '';
    const phone        = params.get('phone') || '';
    const payment      = params.get('payment') || '';
    const productName  = params.get('productName') || '';
    const productPrice = params.get('productPrice') || '';

    if (name.trim() && productName.trim()) {
     
      const now = Date.now(); 
      const estimatedTs = getRandomFutureTimestamp(now, 1, 7); 

      const newOrder = {
        name,
        address,
        phone,
        payment,
        productName,
        productPrice,
        isDelivered: false,
        orderDate: now,          
        estimatedDate: estimatedTs, 
        actualDate: null,         
      };

      
      const alreadyExists = storedOrders.some(
        (o) =>
          o.name === newOrder.name &&
          o.phone === newOrder.phone &&
          o.address === newOrder.address &&
          o.productName === newOrder.productName &&
          o.productPrice === newOrder.productPrice
      );

      let updatedOrders;
      if (!alreadyExists) {
        updatedOrders = [...storedOrders, newOrder];
        setOrders(updatedOrders);
        localStorage.setItem('inventoryOrders', JSON.stringify(updatedOrders));
      } else {
        setOrders(storedOrders);
      }
    } else {
    
      setOrders(storedOrders);
    }
  }, []);

  
  const toggleStatus = (idx) => {
    const updated = [...orders];
    const order = updated[idx];

    order.isDelivered = !order.isDelivered;

    if (order.isDelivered) {
      // Generate actualDate (2–3 days after orderDate)
      order.actualDate = getRandomFutureTimestamp(order.orderDate, 2, 3);
    } else {
      order.actualDate = null;
    }

    setOrders(updated);
    localStorage.setItem('inventoryOrders', JSON.stringify(updated));

    
    if (window.opener) {
      window.opener.postMessage(
        { status: order.isDelivered ? 'Delivered' : 'Pending' },
        'http://localhost:3000'
      );
    }
  };

  const deleteOrder = (idx) => {
    const updated = [...orders];
    updated.splice(idx, 1);
    setOrders(updated);
    localStorage.setItem('inventoryOrders', JSON.stringify(updated));
  };

  
  const filteredOrders = orders.filter((order) => {
    if (filter === 'DELIVERED') return order.isDelivered;
    if (filter === 'PENDING') return !order.isDelivered;
    return true;
  });

  
  const generateInvoice = (order) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1) Draw outer border
  doc.setDrawColor(0, 123, 255);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  // 2) “INVOICE” title
  doc.setFont('helvetica', 'bold').setFontSize(20);
  doc.text('INVOICE', 105, 20, { align: 'center' });

  // 3) Horizontal line under title
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(10, 25, 200, 25);

  // 4) Customer info block
  let y = 35;
  doc.setFont('helvetica', 'normal').setFontSize(12);

  // a) Customer Name
  doc.text(`Customer Name: ${order.name}`, 15, y);
  y += 7;

  // b) Phone
  doc.text(`Phone: ${order.phone}`, 15, y);
  y += 7;

  // c) Address
  doc.text(`Address: ${order.address}`, 15, y);
  y += 7;

  // d) Payment Method
  doc.text(`Payment Method: ${order.payment}`, 15, y);
  y += 7;

  // e) Order Status
  doc.text(`Order Status: ${order.isDelivered ? 'Delivered' : 'Pending'}`, 15, y);
  y += 7;

  // f) Order Date
  const orderDateStr = new Date(order.orderDate).toLocaleDateString();
  doc.text(`Order Date: ${orderDateStr}`, 15, y);
  y += 7;

  // 5) Delivery line: show “Successfully Delivered on: …” directly below Order Date
  if (order.isDelivered) {
    const actualDateStr = new Date(order.actualDate).toLocaleDateString();
    // No stray characters—just the text:
    doc.text(`Successfully Delivered on: ${actualDateStr}`, 15, y);
    y += 7;
  } else {
    // If still pending, show the estimated date instead
    const estDateStr = new Date(order.estimatedDate).toLocaleDateString();
    doc.text(`Estimated Delivery Date: ${estDateStr}`, 15, y);
    y += 7;
  }

  // 6) Separator before the product table
  y += 3; // small gap
  doc.setDrawColor(0).setLineWidth(0.5);
  doc.line(10, y, 200, y);
  y += 7;

  // 7) Product table headers
  const xProd   = 15;
  const xQty    = 100;
  const xUPrice = 130;
  const xTot    = 170;

  doc.setFont('helvetica', 'bold').setFontSize(13);
  doc.text('Product', xProd, y);
  doc.text('Qty', xQty, y, { align: 'center' });
  doc.text('Unit Price', xUPrice, y, { align: 'center' });
  doc.text('Total', xTot, y, { align: 'center' });

  // 8) Thin line under table headers
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(10, y, 200, y);

  // 9) Single product row (qty = 1)
  doc.setFont('helvetica', 'normal').setFontSize(12);
  y += 6;
  const qty = 1;
  const price = parseFloat(order.productPrice) || 0;
  const total = (qty * price).toFixed(2);

  doc.text(order.productName, xProd, y);
  doc.text(qty.toString(), xQty, y, { align: 'center' });
  doc.text(price.toFixed(2), xUPrice, y, { align: 'center' });
  doc.text(total, xTot, y, { align: 'center' });

  // 10) Line under product row
  y += 8;
  doc.setLineWidth(0.5);
  doc.line(10, y, 200, y);

  // 11) Grand Total (in green bold)
  y += 10;
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0, 102, 0);
  doc.text('Grand Total:', 155, y, { align: 'right' });
  doc.text(total, xTot, y, { align: 'center' });

  // 12) Footer “Thank you” note
  y += 20;
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(100, 100, 100);
  doc.text('Thank you for shopping with us!', 105, y, { align: 'center' });

  // 13) Save the PDF
  const fileName = `Invoice_${order.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
};


  return (
    <div className="inventory-container">
      <h2>📦 Inventory Management – Orders</h2>

      <div className="filter-buttons">
        <button
          className={filter === 'ALL' ? 'active' : ''}
          onClick={() => setFilter('ALL')}
        >
          All
        </button>
        <button
          className={filter === 'DELIVERED' ? 'active' : ''}
          onClick={() => setFilter('DELIVERED')}
        >
          Delivered
        </button>
        <button
          className={filter === 'PENDING' ? 'active' : ''}
          onClick={() => setFilter('PENDING')}
        >
          Pending
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <p>🛒 No orders to display.</p>
      ) : (
        <table className="horizontal-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>👤 Name</th>
              <th>🏠 Address</th>
              <th>📞 Phone</th>
              <th>💳 Payment</th>
              <th>📦 Product</th>
              <th>💰 Price</th>
              <th>✅ Status</th>
              <th>📅 Order Date</th>
              <th>🚚 Delivery Date</th>
              <th>🧾 Invoice</th>
              <th>🗑️ Clear</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => {
              // Convert timestamps to locale strings:
              const orderDateStr     = new Date(order.orderDate).toLocaleDateString();
              const deliveryDateStr = order.isDelivered
                ? new Date(order.actualDate).toLocaleDateString()
                : new Date(order.estimatedDate).toLocaleDateString();

              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{order.name}</td>
                  <td>{order.address}</td>
                  <td>{order.phone}</td>
                  <td>{order.payment}</td>
                  <td>{order.productName}</td>
                  <td>₹{order.productPrice}</td>
                  <td>
                    <button
                      className={`status-btn ${
                        order.isDelivered ? 'delivered' : 'pending'
                      }`}
                      onClick={() => toggleStatus(index)}
                    >
                      {order.isDelivered ? '✅ Delivered' : '❌ Pending'}
                    </button>
                  </td>
                  <td>{orderDateStr}</td>
                  <td>{deliveryDateStr}</td>
                  <td>
                    <button
                      className="invoice-btn"
                      onClick={() => generateInvoice(order)}
                    >
                      🧾 Invoice
                    </button>
                  </td>
                  <td>
                    {order.isDelivered && (
                      <button
                        className="clear-btn"
                        onClick={() => deleteOrder(index)}
                      >
                        🗑️ Clear
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Inventory;
