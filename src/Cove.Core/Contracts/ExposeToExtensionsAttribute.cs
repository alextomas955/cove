namespace Cove.Core.Contracts;

/// <summary>
/// The service lifetime used for the forwarding registration of a host service exposed to extensions.
/// Declared independently of any dependency-injection package so the contract stays in the
/// infrastructure-free core assembly.
/// </summary>
public enum ServiceForwardingLifetime
{
    /// <summary>A new instance is provided for every request.</summary>
    Transient,

    /// <summary>A single instance is provided per scope.</summary>
    Scoped,

    /// <summary>A single instance is shared for the lifetime of the application.</summary>
    Singleton,
}

/// <summary>
/// Marks a host service implementation as the backing type for an extension-facing interface. The build
/// emits a forwarding service registration for the marked type and fails compilation when the marked type
/// does not implement <see cref="InterfaceType"/>. Applying this attribute replaces hand-written forwarding
/// registrations: the interface remains the single type extensions bind against, and the concrete type
/// stays private to the host.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public sealed class ExposeToExtensionsAttribute(Type interfaceType) : Attribute
{
    /// <summary>The extension-facing interface the marked type is exposed as.</summary>
    public Type InterfaceType { get; } = interfaceType;

    /// <summary>
    /// The lifetime of the forwarding registration. Defaults to <see cref="ServiceForwardingLifetime.Transient"/>.
    /// </summary>
    public ServiceForwardingLifetime Lifetime { get; init; } = ServiceForwardingLifetime.Transient;
}
