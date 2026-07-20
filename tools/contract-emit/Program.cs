// Emits the canonical contract document from the Cove.Core.Contracts registry.
//
// Reflects over the host-defined key families in Cove.Core.Contracts and serializes them to a
// deterministic, key-sorted JSON document (contracts/cove.contracts.json). The committed document
// is the single source consumed by the type generator, mirroring how the OpenAPI document feeds the
// generated API types. Everything is sorted before writing so a re-run diffs only on real changes.
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Cove.Core.Contracts;

// The const-string catalogs: open key families modeled as static classes of string literals.
Type[] constCatalogs =
[
    typeof(EntityKinds),
    typeof(ExtensionActionKinds),
    typeof(UiComponentKeys),
    typeof(UiPageKeys),
    typeof(UiSlotKeys),
    typeof(UiZoneKeys),
];

// Ordinal sort at every level keeps the output byte-stable across platforms and cultures.
var families = new SortedDictionary<string, SortedDictionary<string, string>>(StringComparer.Ordinal);

foreach (Type catalog in constCatalogs)
{
    var entries = new SortedDictionary<string, string>(StringComparer.Ordinal);
    foreach (FieldInfo field in catalog.GetFields(BindingFlags.Public | BindingFlags.Static))
    {
        // const string members only — the `All` arrays are static readonly (IsInitOnly), not literals.
        if (field is { IsLiteral: true, IsInitOnly: false } && field.FieldType == typeof(string))
        {
            entries[field.Name] = (string)field.GetRawConstantValue()!;
        }
    }

    families[catalog.Name] = entries;
}

// The one closed enum family: read the pinned wire token off each member.
var eventEntries = new SortedDictionary<string, string>(StringComparer.Ordinal);
foreach (EventKinds kind in Enum.GetValues<EventKinds>())
{
    string memberName = kind.ToString();
    FieldInfo member = typeof(EventKinds).GetField(memberName)!;
    JsonStringEnumMemberNameAttribute? wire = member.GetCustomAttribute<JsonStringEnumMemberNameAttribute>();
    eventEntries[memberName] = wire?.Name ?? memberName;
}

families[nameof(EventKinds)] = eventEntries;

// Resolve the output path: explicit argument (MSBuild passes it) or the repo-relative default.
string outPath = args.Length > 0
    ? args[0]
    : Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "contracts", "cove.contracts.json");
outPath = Path.GetFullPath(outPath);

Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);

var options = new JsonSerializerOptions { WriteIndented = true };
string json = JsonSerializer.Serialize(families, options);

// Trailing newline so the committed file is POSIX-clean and re-emits byte-identically.
File.WriteAllText(outPath, json + "\n");

Console.WriteLine($"Emitted {families.Count} contract families to {outPath}");
