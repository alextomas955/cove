namespace Cove.Core.Auth;

public class ForbiddenException : Exception
{
    private readonly IReadOnlyList<string> _missingPermissions;

    /// <summary>The first permission the caller lacked, or null when none was recorded.</summary>
    public string? MissingPermission => _missingPermissions.Count > 0 ? _missingPermissions[0] : null;

    /// <summary>Every permission the caller lacked, in the order the check reported them.</summary>
    public IReadOnlyList<string> MissingPermissions => _missingPermissions;

    public EntityRef? Entity { get; }

    public ForbiddenException(string message, string? missingPermission = null, EntityRef? entity = null)
        : base(message)
    {
        _missingPermissions = missingPermission is null ? [] : [missingPermission];
        Entity = entity;
    }

    private ForbiddenException(string message, IReadOnlyList<string> missingPermissions, EntityRef? entity)
        : base(message)
    {
        _missingPermissions = missingPermissions;
        Entity = entity;
    }

    /// <summary>
    /// Reports every permission a caller lacked. A factory over a private constructor rather than a
    /// public overload, so that <c>new ForbiddenException(message, null)</c> cannot become an
    /// ambiguous call anywhere, in this repository or in an extension.
    /// </summary>
    public static ForbiddenException ForMissingPermissions(
        string message,
        IEnumerable<string> missingPermissions,
        EntityRef? entity = null)
        => new(message, [.. missingPermissions], entity);
}

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message = "Authentication required.") : base(message) { }
}

public class RefreshTokenConflictException : Exception
{
    public RefreshTokenConflictException(string message = "Refresh token was already rotated by another request.") : base(message) { }
}

/// <summary>(EntityKind, EntityId) reference used by content-rule and override checks.</summary>
public readonly record struct EntityRef(string Kind, string Id)
{
    public static EntityRef Of(string kind, int id) => new(kind, id.ToString());
    public static EntityRef Of(string kind, string id) => new(kind, id);
}
