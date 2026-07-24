export type FulfillmentStatus =
  | "RESERVED"
  | "SETTLED"
  | "FULFILLED"
  | "SETTLE_FAILED"
  | "FULFILLMENT_FAILED"
  | "REFUNDED";

export interface FulfillmentRecord {
  idempotencyKey: string;
  fulfillmentId: string;
  paymentId: string;
  status: FulfillmentStatus;
  inventoryReserved: boolean;
  paidResponseReleased: boolean;
  originalPaymentId?: string;
  refundTransaction?: `0x${string}`;
}

export class FulfillmentLedger {
  readonly #records = new Map<string, FulfillmentRecord>();
  #availableSupply: number;

  constructor(initialSupply: number) {
    this.#availableSupply = initialSupply;
  }

  get availableSupply(): number {
    return this.#availableSupply;
  }

  reserve(idempotencyKey: string, paymentId: string): FulfillmentRecord {
    const existing = this.#records.get(idempotencyKey);
    if (existing) return existing;
    if (this.#availableSupply < 1) throw new Error("OUT_OF_STOCK");
    this.#availableSupply -= 1;
    const record: FulfillmentRecord = {
      idempotencyKey,
      fulfillmentId: `fulfillment:${idempotencyKey}`,
      paymentId,
      status: "RESERVED",
      inventoryReserved: true,
      paidResponseReleased: false,
    };
    this.#records.set(idempotencyKey, record);
    return record;
  }

  settlementFailed(idempotencyKey: string): FulfillmentRecord {
    const record = this.require(idempotencyKey);
    if (record.status === "SETTLE_FAILED") return record;
    if (record.status !== "RESERVED") throw new Error("INVALID_SETTLEMENT_FAILURE_TRANSITION");
    record.status = "SETTLE_FAILED";
    record.paidResponseReleased = false;
    this.release(record);
    return record;
  }

  settled(idempotencyKey: string): FulfillmentRecord {
    const record = this.require(idempotencyKey);
    if (record.status === "SETTLED") return record;
    if (record.status !== "RESERVED") throw new Error("INVALID_SETTLED_TRANSITION");
    record.status = "SETTLED";
    return record;
  }

  fulfilled(idempotencyKey: string): FulfillmentRecord {
    const record = this.require(idempotencyKey);
    if (record.status === "FULFILLED") return record;
    if (record.status !== "SETTLED") throw new Error("INVALID_FULFILLMENT_TRANSITION");
    record.status = "FULFILLED";
    record.paidResponseReleased = true;
    record.inventoryReserved = false;
    return record;
  }

  fulfillmentFailed(idempotencyKey: string): FulfillmentRecord {
    const record = this.require(idempotencyKey);
    if (record.status !== "SETTLED") throw new Error("INVALID_FULFILLMENT_FAILURE_TRANSITION");
    record.status = "FULFILLMENT_FAILED";
    record.paidResponseReleased = false;
    return record;
  }

  refundConfirmed(idempotencyKey: string, refundTransaction: `0x${string}`): FulfillmentRecord {
    const record = this.require(idempotencyKey);
    if (record.status === "REFUNDED") return record;
    if (record.status !== "FULFILLMENT_FAILED") throw new Error("INVALID_REFUND_TRANSITION");
    record.status = "REFUNDED";
    record.originalPaymentId = record.paymentId;
    record.refundTransaction = refundTransaction;
    this.release(record);
    return record;
  }

  private require(idempotencyKey: string): FulfillmentRecord {
    const record = this.#records.get(idempotencyKey);
    if (!record) throw new Error("FULFILLMENT_NOT_FOUND");
    return record;
  }

  private release(record: FulfillmentRecord): void {
    if (!record.inventoryReserved) return;
    record.inventoryReserved = false;
    this.#availableSupply += 1;
  }
}
