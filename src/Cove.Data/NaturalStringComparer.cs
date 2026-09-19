namespace Cove.Data;

/// <summary>
/// In-memory counterpart of the <see cref="NaturalSort"/> collation for lists that are sorted after
/// loading: digit runs compare by value, letters ignore case, and ordinal order breaks ties.
/// </summary>
public sealed class NaturalStringComparer : IComparer<string?>
{
    public static readonly NaturalStringComparer Instance = new();

    private NaturalStringComparer() { }

    public int Compare(string? x, string? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        if (x is null) return -1;
        if (y is null) return 1;

        int i = 0, j = 0;
        while (i < x.Length && j < y.Length)
        {
            if (char.IsAsciiDigit(x[i]) && char.IsAsciiDigit(y[j]))
            {
                var result = CompareDigitRuns(x, ref i, y, ref j);
                if (result != 0) return result;
                continue;
            }

            var left = char.ToUpperInvariant(x[i]);
            var right = char.ToUpperInvariant(y[j]);
            if (left != right) return left.CompareTo(right);
            i++;
            j++;
        }

        var remaining = (x.Length - i).CompareTo(y.Length - j);
        return remaining != 0 ? remaining : string.CompareOrdinal(x, y);
    }

    private static int CompareDigitRuns(string x, ref int i, string y, ref int j)
    {
        var startX = i;
        var startY = j;
        while (i < x.Length && char.IsAsciiDigit(x[i])) i++;
        while (j < y.Length && char.IsAsciiDigit(y[j])) j++;

        var digitsX = x.AsSpan(startX, i - startX).TrimStart('0');
        var digitsY = y.AsSpan(startY, j - startY).TrimStart('0');
        return digitsX.Length != digitsY.Length
            ? digitsX.Length.CompareTo(digitsY.Length)
            : digitsX.SequenceCompareTo(digitsY);
    }
}
