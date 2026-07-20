using Microsoft.CodeAnalysis;

namespace Cove.HostServices.Generator;

/// <summary>
/// A value-equatable description of one exposure: the fully-qualified concrete and interface names, the
/// forwarding lifetime, whether the concrete implements the interface, and the source location of the
/// attribute for diagnostic reporting. Holds only strings, enums, and a <see cref="Location"/> so the
/// incremental pipeline caches correctly (no symbols or compilation captured).
/// </summary>
internal sealed record ExposedService(
    string ConcreteFqn,
    string InterfaceFqn,
    ForwardingLifetime Lifetime,
    bool Implements,
    Location Location);
