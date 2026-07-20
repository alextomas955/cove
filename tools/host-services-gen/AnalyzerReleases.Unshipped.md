; Unshipped analyzer release
; https://github.com/dotnet/roslyn-analyzers/blob/main/src/Microsoft.CodeAnalysis.Analyzers/ReleaseTrackingAnalyzers.Help.md

### New Rules

Rule ID | Category | Severity | Notes
--------|----------|----------|-------
COVE0001 | Cove.HostServices | Error | Exposed service must implement its declared interface
COVE0002 | Cove.HostServices | Warning | Interface exposed by more than one concrete type
