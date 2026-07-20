namespace Cove.HostServices.Generator;

/// <summary>
/// The service lifetime for a generated forwarding registration. Mirrors the exposure attribute's lifetime
/// values by ordinal so the generator can read them from the compilation without a runtime reference to the
/// attribute's assembly.
/// </summary>
internal enum ForwardingLifetime
{
    Transient = 0,
    Scoped = 1,
    Singleton = 2,
}
