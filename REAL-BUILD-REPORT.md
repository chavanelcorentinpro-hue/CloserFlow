# CloserFlow V30 — Real Build Report

## version_sync
Status: PASS
```text
Android version synchronized: 30.0.0 (300000)
```

## audit
Status: PASS
```text
CloserFlow V30 production audit
OK  package version 30.0.0
OK  src/App.tsx
OK  capacitor.config.ts
OK  android/app/build.gradle
OK  src/context/AppDataContext.tsx
OK  scripts/sync-version.mjs
OK  scripts/release-check.mjs
OK  routes unique
OK  no clientInteractions
OK  no stockItems
OK  no scheduled_at
OK  no q.total_ht
OK  mixed content disabled
OK  no machine-local android SDK path
OK  Android versionName 30.0.0
OK  Android versionCode 300000
PASS 16 checks
```

## release_check
Status: PASS
```text
CloserFlow 30.0.0 release check
OK   exists src/App.tsx
OK   exists src/main.tsx
OK   exists src/context/AppDataContext.tsx
OK   exists capacitor.config.ts
OK   exists android/app/build.gradle
OK   exists .github/workflows/build-android.yml
OK   exists scripts/production-audit.mjs
OK   exists scripts/sync-version.mjs
OK   lazy page LoginPage
OK   lazy page DashboardPage
OK   lazy page MissionsPage
OK   lazy page NewMissionPage
OK   lazy page MissionDetailPage
OK   lazy page MissionReportPage
OK   lazy page MissionCloseoutPage
OK   lazy page ClientsPage
OK   lazy page MorePage
OK   lazy page QuotesPage
OK   lazy page DocumentDetailPage
OK   lazy page InvoicesPage
OK   lazy page PlanningPage
OK   lazy page TeamPage
OK   lazy page SettingsPage
OK   lazy page SearchPage
OK   lazy page ReportsPage
OK   lazy page AlertsPage
OK   lazy page AssistantPage
OK   lazy page InventoryPage
OK   lazy page OrganizationsPage
OK   lazy page ProcurementPage
OK   lazy page AutomationAuditPage
OK   lazy page ClientPortalPage
OK   lazy page CommandCenterPage
OK   lazy page EndOfDayPage
OK   lazy page FollowUpsPage
OK   lazy page CloudSyncPage
OK   lazy page AccountsPage
OK   lazy page ActivityFeedPage
OK   lazy page ProfitabilityPage
OK   lazy page ElectronicInvoicingPage
OK   lazy page ExpensesPage
OK   lazy page ContractsPage
OK   lazy page CatalogPage
OK   lazy page CashflowPage
OK   lazy page ReservationsPage
OK   lazy page SiteJournalPage
OK   lazy page TimeTrackingPage
OK   lazy page StockScannerPage
OK   lazy page ChecklistTemplatesPage
OK   lazy page ProSuitePage
OK   lazy page BusinessInsightsPage
OK   lazy page TradeEstimatorPage
OK   lazy page SupplierInvoiceCapturePage
OK   lazy page BankReconciliationPage
OK   lazy page DocumentManagementPage
OK   lazy page TerrainPage
OK   lazy page CommercialCrmPage
OK   lazy page SmartPlanningPage
OK   lazy page V10SuitePage
OK   lazy page ApiConnectorsPage
OK   lazy page AccountingTreasuryPage
OK   lazy page SavMaintenancePage
OK   lazy page BusinessIntelligencePage
OK   lazy page RouteOptimizationPage
OK   lazy page PlatformV11Page
OK   lazy page SaaSDeploymentPage
OK   lazy page VisionEstimatorPage
OK   lazy page BackupCenterPage
OK   lazy page OperationsControlPage
OK   lazy page WorkloadForecastPage
OK   lazy page WeeklyPilotPage
OK   lazy page MilestonesPage
OK   lazy page MobileControlCenterPage
OK   lazy page ExecutionSuitePage
OK   lazy page RevenueOpsPage
OK   lazy page BusinessOSPage
OK   lazy page ControlTowerPage
OK   lazy page SupplyChainPage
OK   lazy page FieldOpsPage
OK   lazy page AutomationHubPage
OK   lazy page ExecutiveIntelligencePage
OK   lazy page FinanceAutopilotPage
OK   lazy page PlatformV16Page
OK   lazy page V15OperatingSystemPage
OK   lazy page ClientExperienceV17Page
OK   lazy page SalesAutopilotV18Page
OK   lazy page CompanyAutopilotV19Page
OK   lazy page AutomationEngineV20Page
OK   lazy page CashPilotV21Page
OK   lazy page DailyCommandV22Page
OK   lazy page CapacityPlannerV23Page
OK   lazy page ProfitabilityV24Page
OK   routes unique
OK   Android versionName synced
OK   Android versionCode synced
OK   workflow derives package version
OK   workflow artifact is version-dynamic
OK   stable Android application id
OK   mixed content disabled
PASS: 99 checks
```

## lock_check
Status: PASS
```text
PASS lock cohérent avec package.json 30.0.0
```

## android_release_check
Status: PASS
```text
OK    cleartext traffic disabled
PASS Android release metadata 30.0.0 (300000)
```

## npm ci
Status: FAIL
```text
npm ci timed out after 45 seconds in this environment.
```

## APK
Aucun APK généré dans cet environnement.
