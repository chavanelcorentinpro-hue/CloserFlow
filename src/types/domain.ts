export type MissionStatus =
  | 'prospect' | 'visit' | 'quote' | 'accepted' | 'planned'
  | 'in_progress' | 'completed' | 'invoiced' | 'paid' | 'archived';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'partial' | 'paid';
export type TeamRole = 'admin' | 'manager' | 'technician' | 'employee' | 'subcontractor';
export interface TeamMember { id:string; name:string; email:string; phone?:string; role:TeamRole; active:boolean; color:string; hourly_cost?:number; skills?:string[]; created_at:string; }

export interface Client {
  id: string; first_name: string; last_name: string; company_name: string | null;
  phone: string | null; email: string | null; address: string | null; notes: string | null; created_at: string;
  customer_type?: 'business'|'consumer'|'public'; siren?: string | null; vat_number?: string | null; purchase_order_reference?: string | null;
}
export interface MissionNote { id: string; text: string; created_at: string; }
export interface MissionMaterial { id: string; label: string; quantity: number; unit: string; created_at: string; }
export interface MissionExpense { id: string; label: string; amount: number; created_at: string; }
export interface MissionTask { id: string; label: string; done: boolean; created_at: string; }
export interface MissionPhoto { id:string; data_url:string; category:'before'|'after'; caption:string; created_at:string; }
export interface MissionSignature { data_url:string; signer_name:string; signed_at:string; }
export interface MissionCloseout { validated_at:string; validated_by:string; customer_comment:string; satisfaction:number; }
export interface ChecklistTemplate { id:string; name:string; description:string; tasks:string[]; created_at:string; }
export interface Mission {
  id: string; client_id: string | null; assigned_user_id?: string | null; title: string; description: string | null; status: MissionStatus;
  address: string | null; scheduled_start: string | null; scheduled_end: string | null;
  started_at: string | null; finished_at: string | null; price_ht: number; created_at: string;
  client?: Pick<Client, 'id' | 'first_name' | 'last_name' | 'company_name' | 'phone'> | null;
  notes?: MissionNote[]; materials?: MissionMaterial[]; expenses?: MissionExpense[]; tasks?: MissionTask[];
  photos?: MissionPhoto[]; signature?: MissionSignature | null; closeout?: MissionCloseout | null;
}
export interface DocumentLine { id:string; description:string; quantity:number; unit:string; unit_price_ht:number; }
export interface DocumentRevision {
  id:string; revision:number; saved_at:string; reason:string;
  client_id:string|null; title:string; vat_rate:number; discount_percent:number; lines:DocumentLine[];
}
export interface Quote {
  id:string; number:string; client_id:string|null; mission_id:string|null; title:string;
  status:QuoteStatus; vat_rate:number; discount_percent:number; lines:DocumentLine[]; created_at:string;
  updated_at?:string|null; revision?:number; revisions?:DocumentRevision[];
}
export interface InvoicePayment { id:string; amount:number; method:'card'|'transfer'|'cash'|'check'|'other'; note:string; paid_at:string; }
export interface Invoice {
  id:string; number:string; client_id:string|null; mission_id:string|null; quote_id:string|null; title:string;
  status:InvoiceStatus; vat_rate:number; discount_percent:number; lines:DocumentLine[];
  due_date:string|null; created_at:string; paid_at:string|null; payments:InvoicePayment[];
  updated_at?:string|null; revision?:number; revisions?:DocumentRevision[];
  corrected_invoice_id?:string|null; correction_reason?:string|null;
}
export interface InventoryMovement { id:string; quantity:number; type:'in'|'out'|'adjustment'; note:string; created_at:string; }
export interface InventoryItem { id:string; name:string; sku:string; unit:string; quantity:number; minimum_quantity:number; location:string; movements:InventoryMovement[]; created_at:string; }
export interface CompanyProfile { name:string; siret:string; vat_number:string; phone:string; email:string; address:string; iban?:string; bic?:string; legal_form?:string; capital?:string; rcs_city?:string; }

export type WorkspaceRole = 'owner'|'manager'|'technician'|'viewer';
export interface Organization { id:string; name:string; siret:string; vat_number:string; phone:string; email:string; address:string; created_at:string; }
export interface AuditEntry { id:string; organization_id:string; actor:string; action:string; entity:string; detail:string; created_at:string; }
export interface Warehouse { id:string; organization_id:string; name:string; type:'warehouse'|'vehicle'; address:string; active:boolean; created_at:string; }
export interface Supplier { id:string; organization_id:string; name:string; contact_name:string; email:string; phone:string; address:string; notes:string; created_at:string; }
export interface PurchaseOrderLine { id:string; description:string; quantity:number; unit:string; unit_price_ht:number; sku?:string; inventory_item_id?:string|null; received_quantity?:number; }
export interface PurchaseOrder { id:string; organization_id:string; number:string; supplier_id:string|null; warehouse_id:string|null; status:'draft'|'sent'|'partial'|'received'|'cancelled'; expected_at:string|null; lines:PurchaseOrderLine[]; created_at:string; }
export interface PurchaseReceiptLine { purchase_order_line_id:string; description:string; quantity:number; inventory_item_id:string|null; }
export interface PurchaseReceipt { id:string; organization_id:string; purchase_order_id:string; number:string; received_at:string; note:string; lines:PurchaseReceiptLine[]; created_at:string; }
export interface AutomationRule { id:string; organization_id:string; name:string; trigger:'quote_accepted'|'invoice_overdue'|'mission_completed'|'stock_low'; action:'create_invoice'|'create_task'|'notify'|'create_purchase_order'; active:boolean; created_at:string; }

export interface TimeEntry { id:string; mission_id:string; user_id:string|null; started_at:string; ended_at:string|null; hourly_cost:number; note:string; created_at:string; }

export type ExpenseCategory='materials'|'fuel'|'tools'|'subcontracting'|'insurance'|'other';
export interface BusinessExpense { id:string; label:string; supplier:string; category:ExpenseCategory; amount_ht:number; vat_rate:number; expense_date:string; mission_id:string|null; paid:boolean; created_at:string; }
export interface MaintenanceContract { id:string; client_id:string|null; title:string; frequency:'monthly'|'quarterly'|'yearly'; amount_ht:number; vat_rate:number; next_due_date:string; active:boolean; notes:string; created_at:string; }
export type MaintenanceVisitStatus='planned'|'completed'|'cancelled';
export interface MaintenanceVisit { id:string; contract_id:string|null; client_id:string|null; mission_id:string|null; title:string; scheduled_date:string; status:MaintenanceVisitStatus; technician_id:string|null; duration_minutes:number; notes:string; parts:string[]; created_at:string; completed_at:string|null; }
export interface WarrantyRecord { id:string; client_id:string|null; mission_id:string|null; equipment:string; serial_number:string; installed_at:string; warranty_end:string; supplier:string; notes:string; active:boolean; created_at:string; }
export type EInvoiceStatus='draft'|'ready'|'submitted'|'accepted'|'rejected'|'paid';
export interface EInvoiceTracking { invoice_id:string; status:EInvoiceStatus; platform:string; external_id:string; updated_at:string; message:string; }


export type SiteJournalCategory='progress'|'incident'|'delivery'|'client'|'weather'|'other';
export interface SiteJournalEntry { id:string; mission_id:string; category:SiteJournalCategory; title:string; description:string; author:string; occurred_at:string; important:boolean; created_at:string; }

export interface QuoteApproval { quote_id:string; client_id:string; signer_name:string; signature_data_url:string; decision:'accepted'|'rejected'; comment:string; decided_at:string; }
export interface ClientPortalMessage { id:string; client_id:string; author:'client'|'company'; text:string; created_at:string; read:boolean; }
export interface PortalPaymentIntent { id:string; invoice_id:string; client_id:string; amount:number; method:'transfer'|'card_link'|'cash'|'check'; note:string; status:'requested'|'submitted'|'confirmed'|'cancelled'; created_at:string; submitted_at:string|null; confirmed_at:string|null; }

export interface ClientPortalEvent { id:string; client_id:string; type:'view'|'quote_signed'|'quote_rejected'|'payment_submitted'|'payment_confirmed'|'message'|'appointment_request'; label:string; created_at:string; }
export interface ClientAppointmentRequest { id:string; client_id:string; mission_id:string|null; preferred_date:string; preferred_period:'morning'|'afternoon'|'evening'|'any'; note:string; status:'pending'|'accepted'|'rejected'; created_at:string; answered_at:string|null; }
