using System.Collections;
using System.Collections.Immutable;

namespace Cove.HostServices.Generator;

/// <summary>
/// An immutable array wrapper with structural (element-wise) equality, so it can be used as a model value in
/// the incremental generator pipeline. The built-in <see cref="ImmutableArray{T}"/> compares by reference,
/// which defeats pipeline caching.
/// </summary>
internal readonly struct EquatableArray<T>(ImmutableArray<T> array) : IEquatable<EquatableArray<T>>, IEnumerable<T>
    where T : IEquatable<T>
{
    public static readonly EquatableArray<T> Empty = new(ImmutableArray<T>.Empty);

    private readonly ImmutableArray<T> _array = array;

    public int Length => _array.IsDefault ? 0 : _array.Length;

    public ReadOnlySpan<T> AsSpan() => _array.IsDefault ? ReadOnlySpan<T>.Empty : _array.AsSpan();

    public bool Equals(EquatableArray<T> other)
    {
        if (_array.IsDefault || other._array.IsDefault)
        {
            return _array.IsDefault && other._array.IsDefault;
        }

        return _array.AsSpan().SequenceEqual(other._array.AsSpan());
    }

    public override bool Equals(object? obj) => obj is EquatableArray<T> other && Equals(other);

    public override int GetHashCode()
    {
        if (_array.IsDefault)
        {
            return 0;
        }

        var hash = 17;
        foreach (var item in _array)
        {
            hash = (hash * 31) + (item?.GetHashCode() ?? 0);
        }

        return hash;
    }

    public IEnumerator<T> GetEnumerator() =>
        (_array.IsDefault ? Enumerable.Empty<T>() : _array).GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
