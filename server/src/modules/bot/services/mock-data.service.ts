export interface TtnData {
  orderNumber: string;
  ttn: string;
  status: string;
  deliveryDate: string;
  recipient: string;
  address: string;
}

export interface ReceiptData {
  orderNumber: string;
  receiptNumber: string;
  amount: number;
  date: string;
  items: string[];
}

export class MockDataService {
  private static ttnData: Map<string, TtnData> = new Map([
    ['12345', {
      orderNumber: '12345',
      ttn: 'TTN-2024-001234',
      status: 'В пути',
      deliveryDate: '2024-12-05',
      recipient: 'Иван Иванов',
      address: 'г. Киев, ул. Крещатик, д. 1, кв. 10'
    }],
    ['67890', {
      orderNumber: '67890',
      ttn: 'TTN-2024-005678',
      status: 'Доставлено',
      deliveryDate: '2024-12-01',
      recipient: 'Мария Петрова',
      address: 'г. Киев, ул. Шевченко, д. 25, кв. 5'
    }],
    ['11111', {
      orderNumber: '11111',
      ttn: 'TTN-2024-001111',
      status: 'Ожидает отправки',
      deliveryDate: '2024-12-10',
      recipient: 'Петр Сидоров',
      address: 'г. Киев, пр. Победы, д. 50, кв. 20'
    }]
  ]);

  private static receiptData: Map<string, ReceiptData> = new Map([
    ['12345', {
      orderNumber: '12345',
      receiptNumber: 'RCP-2024-001234',
      amount: 1500.00,
      date: '2024-11-28',
      items: ['Товар 1', 'Товар 2', 'Товар 3']
    }],
    ['67890', {
      orderNumber: '67890',
      receiptNumber: 'RCP-2024-005678',
      amount: 2500.50,
      date: '2024-11-25',
      items: ['Товар A', 'Товар B']
    }],
    ['11111', {
      orderNumber: '11111',
      receiptNumber: 'RCP-2024-001111',
      amount: 999.99,
      date: '2024-11-30',
      items: ['Товар X']
    }]
  ]);

  static getTtn(orderNumber: string): TtnData | null {
    return this.ttnData.get(orderNumber) || null;
  }

  static getReceipt(orderNumber: string): ReceiptData | null {
    return this.receiptData.get(orderNumber) || null;
  }

  static getAllTtnOrders(): string[] {
    return Array.from(this.ttnData.keys());
  }

  static getAllReceiptOrders(): string[] {
    return Array.from(this.receiptData.keys());
  }
}

