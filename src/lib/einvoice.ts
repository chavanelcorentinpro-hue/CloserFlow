import type { Client, CompanyProfile, EInvoiceTracking, Invoice } from '../types/domain';
import { totals } from './documents';

const xml=(value:unknown)=>String(value??'').replace(/[<>&'\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':'&quot;'}[ch]!));
const compact=(value:string|null|undefined)=>String(value??'').replace(/\s/g,'');
const validDate=(value:string|null|undefined)=>Boolean(value&&!Number.isNaN(new Date(value).getTime()));
const isoDate=(value:string|null|undefined)=>validDate(value)?new Date(value!).toISOString().slice(0,10):'';
const yyyymmdd=(value:string|null|undefined)=>isoDate(value).replaceAll('-','');
const amount=(value:number)=>Number.isFinite(value)?value.toFixed(2):'0.00';
const buyerName=(client:Client)=>client.company_name?.trim()||`${client.first_name} ${client.last_name}`.trim();
const taxCategory=(vatRate:number)=>vatRate===0?'Z':'S';
const unitCode=(unit:string)=>{
 const normalized=unit.trim().toLowerCase();
 if(['h','heure','heures'].includes(normalized))return 'HUR';
 if(['m2','m²'].includes(normalized))return 'MTK';
 if(['m3','m³'].includes(normalized))return 'MTQ';
 if(['m','ml','mètre','metre'].includes(normalized))return 'MTR';
 if(['kg','kilogramme'].includes(normalized))return 'KGM';
 return 'C62';
};

export interface ComplianceIssue { level:'error'|'warning'; code:string; label:string; }
export interface ComplianceResult { issues:ComplianceIssue[]; errors:number; warnings:number; score:number; ready:boolean; }
export interface XmlValidationResult { valid:boolean; format:'UBL'|'CII'; checks:{label:string;ok:boolean}[]; }

export function invoiceCompliance(company:CompanyProfile,client:Client|undefined,invoice:Invoice):ComplianceIssue[]{
 const issues:ComplianceIssue[]=[];
 const push=(level:ComplianceIssue['level'],code:string,label:string)=>issues.push({level,code,label});
 if(!company.name.trim())push('error','SELLER_NAME','Nom de l’entreprise émettrice manquant');
 if(!/^\d{14}$/.test(compact(company.siret)))push('error','SELLER_SIRET','SIRET émetteur absent ou invalide (14 chiffres)');
 if(!company.address.trim())push('error','SELLER_ADDRESS','Adresse de l’émetteur manquante');
 if(!company.email.trim())push('warning','SELLER_EMAIL','Adresse e-mail de l’émetteur non renseignée');
 if(invoice.vat_rate>0&&!/^FR[A-Z0-9]{2}\d{9}$/i.test(compact(company.vat_number)))push('error','SELLER_VAT','Numéro de TVA français absent ou invalide');
 if(!client)push('error','BUYER_MISSING','Client introuvable');
 if(client?.customer_type==='business'&&!/^\d{9}$/.test(compact(client.siren)))push('error','BUYER_SIREN','SIREN client B2B absent ou invalide');
 if(client?.customer_type==='business'&&!client.company_name?.trim())push('error','BUYER_NAME','Raison sociale du client B2B non renseignée');
 if(client?.customer_type==='business'&&client.vat_number&&!/^FR[A-Z0-9]{2}\d{9}$/i.test(compact(client.vat_number)))push('warning','BUYER_VAT','Numéro de TVA client renseigné mais invalide');
 if(client?.customer_type==='public'&&!client.purchase_order_reference?.trim())push('error','BUYER_REFERENCE','Référence de commande obligatoire pour ce client public');
 if(!client?.address?.trim())push('error','BUYER_ADDRESS','Adresse du client manquante');
 if(!client?.email?.trim())push('warning','BUYER_EMAIL','Adresse e-mail du client non renseignée');
 if(!invoice.number.trim())push('error','INVOICE_NUMBER','Numéro de facture manquant');
 if(!validDate(invoice.created_at))push('error','ISSUE_DATE','Date de facture absente ou invalide');
 if(!validDate(invoice.due_date))push('error','DUE_DATE','Date d’échéance absente ou invalide');
 if(validDate(invoice.created_at)&&validDate(invoice.due_date)&&new Date(invoice.due_date!).getTime()<new Date(invoice.created_at).getTime())push('error','DATE_ORDER','La date d’échéance précède la date de facture');
 if(!invoice.lines.length)push('error','LINES_EMPTY','Aucune ligne de facturation');
 invoice.lines.forEach((line,index)=>{
  const prefix=`Ligne ${index+1}`;
  if(!line.description.trim())push('error','LINE_DESCRIPTION',`${prefix} : description manquante`);
  if(!Number.isFinite(line.quantity)||line.quantity<=0)push('error','LINE_QUANTITY',`${prefix} : quantité nulle, négative ou invalide`);
  if(!line.unit.trim())push('warning','LINE_UNIT',`${prefix} : unité non renseignée`);
  if(!Number.isFinite(line.unit_price_ht)||line.unit_price_ht<0)push('error','LINE_PRICE',`${prefix} : prix unitaire négatif ou invalide`);
 });
 if(!Number.isFinite(invoice.discount_percent)||invoice.discount_percent<0||invoice.discount_percent>100)push('error','DISCOUNT_RATE','Remise globale invalide');
 if(!Number.isFinite(invoice.vat_rate)||invoice.vat_rate<0||invoice.vat_rate>100)push('error','VAT_RATE','Taux de TVA invalide');
 if(invoice.vat_rate===0)push('warning','VAT_EXEMPTION','TVA à 0 % : vérifier la mention ou le motif d’exonération avant transmission');
 if(!company.iban?.trim())push('warning','PAYMENT_ACCOUNT','IBAN non renseigné pour le règlement par virement');
 return issues;
}

export function complianceResult(company:CompanyProfile,client:Client|undefined,invoice:Invoice):ComplianceResult{
 const issues=invoiceCompliance(company,client,invoice);
 const errors=issues.filter(x=>x.level==='error').length;
 const warnings=issues.filter(x=>x.level==='warning').length;
 return {issues,errors,warnings,ready:errors===0,score:Math.max(0,100-errors*15-warnings*3)};
}

export function buildUblInvoice(company:CompanyProfile,client:Client,invoice:Invoice):string{
 const t=totals(invoice.lines,invoice.discount_percent,invoice.vat_rate);
 const category=taxCategory(invoice.vat_rate);
 const allowance=invoice.discount_percent>0?`<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>Remise globale</cbc:AllowanceChargeReason><cbc:MultiplierFactorNumeric>${invoice.discount_percent/100}</cbc:MultiplierFactorNumeric><cbc:Amount currencyID="EUR">${amount(t.discount)}</cbc:Amount><cbc:BaseAmount currencyID="EUR">${amount(t.base)}</cbc:BaseAmount></cac:AllowanceCharge>`:'';
 const lines=invoice.lines.map((line,index)=>`<cac:InvoiceLine><cbc:ID>${index+1}</cbc:ID><cbc:InvoicedQuantity unitCode="${unitCode(line.unit)}">${line.quantity}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">${amount(line.quantity*line.unit_price_ht)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${xml(line.description)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${category}</cbc:ID><cbc:Percent>${invoice.vat_rate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">${amount(line.unit_price_ht)}</cbc:PriceAmount><cbc:BaseQuantity unitCode="${unitCode(line.unit)}">1</cbc:BaseQuantity></cac:Price></cac:InvoiceLine>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID><cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID><cbc:ID>${xml(invoice.number)}</cbc:ID><cbc:IssueDate>${isoDate(invoice.created_at)}</cbc:IssueDate><cbc:DueDate>${isoDate(invoice.due_date)}</cbc:DueDate><cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>${client.purchase_order_reference?`<cbc:BuyerReference>${xml(client.purchase_order_reference)}</cbc:BuyerReference>`:''}<cac:AccountingSupplierParty><cac:Party><cac:EndpointID schemeID="0002">${xml(compact(company.siret))}</cac:EndpointID><cac:PartyIdentification><cbc:ID schemeID="0002">${xml(compact(company.siret))}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>${xml(company.name)}</cbc:Name></cac:PartyName><cac:PostalAddress><cbc:StreetName>${xml(company.address)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${company.vat_number?`<cac:PartyTaxScheme><cbc:CompanyID>${xml(compact(company.vat_number))}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`:''}<cac:PartyLegalEntity><cbc:RegistrationName>${xml(company.name)}</cbc:RegistrationName><cbc:CompanyID schemeID="0002">${xml(compact(company.siret))}</cbc:CompanyID></cac:PartyLegalEntity><cac:Contact><cbc:ElectronicMail>${xml(company.email)}</cbc:ElectronicMail></cac:Contact></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party>${client.siren?`<cac:EndpointID schemeID="0002">${xml(compact(client.siren))}</cac:EndpointID><cac:PartyIdentification><cbc:ID schemeID="0002">${xml(compact(client.siren))}</cbc:ID></cac:PartyIdentification>`:''}<cac:PartyName><cbc:Name>${xml(buyerName(client))}</cbc:Name></cac:PartyName><cac:PostalAddress><cbc:StreetName>${xml(client.address)}</cbc:StreetName><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${client.vat_number?`<cac:PartyTaxScheme><cbc:CompanyID>${xml(compact(client.vat_number))}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`:''}<cac:PartyLegalEntity><cbc:RegistrationName>${xml(buyerName(client))}</cbc:RegistrationName>${client.siren?`<cbc:CompanyID schemeID="0002">${xml(compact(client.siren))}</cbc:CompanyID>`:''}</cac:PartyLegalEntity>${client.email?`<cac:Contact><cbc:ElectronicMail>${xml(client.email)}</cbc:ElectronicMail></cac:Contact>`:''}</cac:Party></cac:AccountingCustomerParty><cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode><cbc:PaymentID>${xml(invoice.number)}</cbc:PaymentID>${company.iban?`<cac:PayeeFinancialAccount><cbc:ID>${xml(compact(company.iban))}</cbc:ID>${company.bic?`<cac:FinancialInstitutionBranch><cbc:ID>${xml(compact(company.bic))}</cbc:ID></cac:FinancialInstitutionBranch>`:''}</cac:PayeeFinancialAccount>`:''}</cac:PaymentMeans><cac:PaymentTerms><cbc:Note>Échéance au ${isoDate(invoice.due_date)}</cbc:Note></cac:PaymentTerms>${allowance}<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${amount(t.vat)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${amount(t.ht)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${amount(t.vat)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${category}</cbc:ID><cbc:Percent>${invoice.vat_rate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${amount(t.base)}</cbc:LineExtensionAmount><cbc:AllowanceTotalAmount currencyID="EUR">${amount(t.discount)}</cbc:AllowanceTotalAmount><cbc:TaxExclusiveAmount currencyID="EUR">${amount(t.ht)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${amount(t.ttc)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">${amount(t.ttc)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</Invoice>`;
}

export function buildCiiInvoice(company:CompanyProfile,client:Client,invoice:Invoice):string{
 const t=totals(invoice.lines,invoice.discount_percent,invoice.vat_rate);
 const category=taxCategory(invoice.vat_rate);
 const lines=invoice.lines.map((line,index)=>`<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${index+1}</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct><ram:Name>${xml(line.description)}</ram:Name></ram:SpecifiedTradeProduct><ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amount(line.unit_price_ht)}</ram:ChargeAmount><ram:BasisQuantity unitCode="${unitCode(line.unit)}">1</ram:BasisQuantity></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement><ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(line.unit)}">${line.quantity}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery><ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${category}</ram:CategoryCode><ram:RateApplicablePercent>${invoice.vat_rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(line.quantity*line.unit_price_ht)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>`).join('');
 const allowance=invoice.discount_percent>0?`<ram:SpecifiedTradeAllowanceCharge><ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator><ram:CalculationPercent>${invoice.discount_percent}</ram:CalculationPercent><ram:BasisAmount>${amount(t.base)}</ram:BasisAmount><ram:ActualAmount>${amount(t.discount)}</ram:ActualAmount><ram:Reason>Remise globale</ram:Reason><ram:CategoryTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${category}</ram:CategoryCode><ram:RateApplicablePercent>${invoice.vat_rate}</ram:RateApplicablePercent></ram:CategoryTradeTax></ram:SpecifiedTradeAllowanceCharge>`:'';
 return `<?xml version="1.0" encoding="UTF-8"?>\n<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>${xml(invoice.number)}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${yyyymmdd(invoice.created_at)}</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument><rsm:SupplyChainTradeTransaction>${lines}<ram:ApplicableHeaderTradeAgreement>${client.purchase_order_reference?`<ram:BuyerReference>${xml(client.purchase_order_reference)}</ram:BuyerReference>`:''}<ram:SellerTradeParty><ram:ID>${xml(compact(company.siret))}</ram:ID><ram:Name>${xml(company.name)}</ram:Name><ram:PostalTradeAddress><ram:LineOne>${xml(company.address)}</ram:LineOne><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>${company.vat_number?`<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xml(compact(company.vat_number))}</ram:ID></ram:SpecifiedTaxRegistration>`:''}</ram:SellerTradeParty><ram:BuyerTradeParty>${client.siren?`<ram:ID>${xml(compact(client.siren))}</ram:ID>`:''}<ram:Name>${xml(buyerName(client))}</ram:Name><ram:PostalTradeAddress><ram:LineOne>${xml(client.address)}</ram:LineOne><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>${client.vat_number?`<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xml(compact(client.vat_number))}</ram:ID></ram:SpecifiedTaxRegistration>`:''}</ram:BuyerTradeParty></ram:ApplicableHeaderTradeAgreement><ram:ApplicableHeaderTradeDelivery/><ram:ApplicableHeaderTradeSettlement><ram:PaymentReference>${xml(invoice.number)}</ram:PaymentReference><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${company.iban?`<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${xml(compact(company.iban))}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>${company.bic?`<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${xml(compact(company.bic))}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>`:''}</ram:SpecifiedTradeSettlementPaymentMeans>`:''}<ram:ApplicableTradeTax><ram:CalculatedAmount>${amount(t.vat)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>${amount(t.ht)}</ram:BasisAmount><ram:CategoryCode>${category}</ram:CategoryCode><ram:RateApplicablePercent>${invoice.vat_rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax>${allowance}<ram:SpecifiedTradePaymentTerms><ram:Description>Échéance au ${isoDate(invoice.due_date)}</ram:Description><ram:DueDateDateTime><udt:DateTimeString format="102">${yyyymmdd(invoice.due_date)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms><ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${amount(t.base)}</ram:LineTotalAmount><ram:AllowanceTotalAmount>${amount(t.discount)}</ram:AllowanceTotalAmount><ram:TaxBasisTotalAmount>${amount(t.ht)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${amount(t.vat)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${amount(t.ttc)}</ram:GrandTotalAmount><ram:DuePayableAmount>${amount(t.ttc)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation></ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;
}

export function validateGeneratedXml(content:string,format:'UBL'|'CII'):XmlValidationResult{
 const required=format==='UBL'
  ?['<?xml','<Invoice ','<cbc:CustomizationID>','<cbc:ID>','<cbc:IssueDate>','<cac:AccountingSupplierParty>','<cac:AccountingCustomerParty>','<cac:TaxTotal>','<cac:LegalMonetaryTotal>','</Invoice>']
  :['<?xml','<rsm:CrossIndustryInvoice ','<rsm:ExchangedDocumentContext>','<ram:ID>','<ram:IssueDateTime>','<ram:SellerTradeParty>','<ram:BuyerTradeParty>','<ram:ApplicableTradeTax>','<ram:SpecifiedTradeSettlementHeaderMonetarySummation>','</rsm:CrossIndustryInvoice>'];
 const checks=required.map(token=>({label:`Présence ${token.replace(/[<>]/g,'')}`,ok:content.includes(token)}));
 checks.push({label:'Aucune valeur numérique invalide',ok:!content.includes('NaN')&&!content.includes('Infinity')});
 checks.push({label:'Aucun champ undefined/null sérialisé',ok:!content.includes('undefined')&&!content.includes('>null<')});
 return {format,checks,valid:checks.every(check=>check.ok)};
}

function fingerprint(content:string){let hash=2166136261;for(let i=0;i<content.length;i++){hash^=content.charCodeAt(i);hash=Math.imul(hash,16777619)}return `fnv1a-${(hash>>>0).toString(16).padStart(8,'0')}`}

export function buildEvidenceBundle(company:CompanyProfile,client:Client,invoice:Invoice,tracking?:EInvoiceTracking):string{
 const result=complianceResult(company,client,invoice);
 const t=totals(invoice.lines,invoice.discount_percent,invoice.vat_rate);
 const ubl=buildUblInvoice(company,client,invoice);const cii=buildCiiInvoice(company,client,invoice);
 return JSON.stringify({
  schema:'closerflow.einvoice.evidence.v2',generated_at:new Date().toISOString(),invoice_number:invoice.number,
  issuer:{name:company.name,siret:compact(company.siret),vat_number:compact(company.vat_number)},
  buyer:{name:buyerName(client),siren:compact(client.siren),vat_number:compact(client.vat_number),type:client.customer_type},
  amounts:{currency:'EUR',base:t.base,discount:t.discount,ht:t.ht,vat:t.vat,ttc:t.ttc},compliance:result,
  xml_validation:{ubl:validateGeneratedXml(ubl,'UBL'),cii:validateGeneratedXml(cii,'CII')},
  fingerprints:{ubl:fingerprint(ubl),cii:fingerprint(cii)},tracking:tracking??null,
  note:'Dossier de preuve technique local. Les empreintes FNV servent à détecter une modification accidentelle, pas à fournir une signature cryptographique ni un archivage réglementaire.'
 },null,2);
}

export function buildTransmissionPackage(company:CompanyProfile,client:Client,invoice:Invoice,tracking?:EInvoiceTracking):string{
 const ubl=buildUblInvoice(company,client,invoice);const cii=buildCiiInvoice(company,client,invoice);
 return JSON.stringify({schema:'closerflow.einvoice.package.v1',generated_at:new Date().toISOString(),invoice_number:invoice.number,files:{
  [`${invoice.number}-UBL.xml`]:ubl,[`${invoice.number}-CII.xml`]:cii,[`${invoice.number}-preuve.json`]:JSON.parse(buildEvidenceBundle(company,client,invoice,tracking))
 }},null,2);
}

export function downloadText(filename:string,content:string,type='application/xml'){
 const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
