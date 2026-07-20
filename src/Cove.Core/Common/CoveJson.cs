using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace Cove.Core.Common;

/// <summary>
/// The single canonical <see cref="JsonSerializerOptions"/> for Cove's wire format. Every
/// serialization boundary (MVC, SignalR, minimal-API/extension endpoints, and manual
/// serialize/deserialize call sites) routes through this instance so the emitted shape is
/// consistent: camelCase properties, case-insensitive lenient reads, and camelCase named-string
/// enums (int or string accepted on read).
/// </summary>
public static class CoveJson
{
    /// <summary>
    /// Frozen canonical options. Combines the source-generated <see cref="CoveJsonContext"/>
    /// (fast path for registered host DTOs) with a reflection resolver so runtime-loaded
    /// extension types still serialize. Enums emit as camelCase strings via the global
    /// converter — including reflection-fallback enums that the source-gen context does not
    /// cover — while <c>CriterionModifier</c> keeps its type-specific lenient converter.
    /// </summary>
    public static JsonSerializerOptions Default { get; } = BuildDefault();

    private static JsonSerializerOptions BuildDefault()
    {
        // Retain Web semantics: camelCase properties, case-insensitive read, AllowReadingFromString.
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            // Source-gen for registered host types; reflection fallback for everything else,
            // including per-extension AssemblyLoadContext types that cannot be pre-registered.
            TypeInfoResolver = JsonTypeInfoResolver.Combine(
                CoveJsonContext.Default,
                new DefaultJsonTypeInfoResolver()),
        };

        // Order matters. (1) The global string-enum policy covers the reflection-fallback path
        // (all extension-ALC enums and every unregistered host DTO enum); without it those enums
        // would emit their default integer and defeat the canonical wire format. (2) The
        // type-specific CriterionModifier converter is registered AFTER, and a typed
        // JsonConverter<T> takes precedence, so CriterionModifier keeps its extra read leniency
        // while every other enum flows through the global converter.
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.Converters.Add(new CriterionModifierJsonConverter());

        // Freeze once, after the resolver and both converters are set.
        options.MakeReadOnly();
        return options;
    }
}
