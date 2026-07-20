using System.Text.Json.Serialization;
using Cove.Core.Auth;
using Cove.Core.DTOs;

namespace Cove.Core.Common;

/// <summary>
/// Source-generated serializer context backing the canonical <see cref="CoveJson.Default"/>
/// options. Provides fast, generator-produced metadata for the registered host DTO roots;
/// anything not registered here degrades to the reflection resolver combined into
/// <see cref="CoveJson.Default"/> (it does not throw), so this list can grow incrementally.
///
/// <para>
/// <c>UseStringEnumConverter = true</c> is the fast path for enums reachable from the
/// registered <see cref="JsonSerializableAttribute"/> graph only. Enums resolved via the
/// reflection fallback — every runtime-loaded extension type and every unregistered host
/// DTO enum — are governed by the global string-enum converter added to
/// <see cref="CoveJson.Default"/>, not by this attribute.
/// </para>
///
/// <para>
/// Polymorphic wire types convention (for future use — no wire-polymorphic type exists today):
/// annotate a base type that is genuinely serialized as its base over the wire with
/// <c>[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]</c> and string-valued
/// <c>[JsonDerivedType(typeof(TDerived), "kind")]</c> discriminators. Rules to respect:
/// the discriminator must appear first on read; it must NOT be declared <c>required</c>;
/// values must always be serialized through the base type (a manual
/// <c>Serialize&lt;TConcrete&gt;</c> drops the discriminator); and consider
/// <c>JsonUnknownDerivedTypeHandling</c> so newer derived types keep a discriminator when
/// round-tripped through an older reader. Do not annotate persistence-only or in-process
/// hierarchies that never cross the wire as their base type.
/// </para>
/// </summary>
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase, UseStringEnumConverter = true)]
[JsonSerializable(typeof(VideoDto))]
[JsonSerializable(typeof(PaginatedResponse<VideoDto>))]
[JsonSerializable(typeof(CoveConfigDto))]
[JsonSerializable(typeof(UserUiPreferencesDto))]
public partial class CoveJsonContext : JsonSerializerContext
{
}
