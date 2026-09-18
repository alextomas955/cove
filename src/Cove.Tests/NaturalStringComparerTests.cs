using Cove.Data;

namespace Cove.Tests;

public class NaturalStringComparerTests
{
    [Fact]
    public void DigitRunsCompareByValue()
    {
        string[] names = ["image_10.jpg", "image_2.jpg", "image_1.jpg", "image_20.jpg", "image_11.jpg"];

        var sorted = names.OrderBy(name => name, NaturalStringComparer.Instance).ToArray();

        Assert.Equal(["image_1.jpg", "image_2.jpg", "image_10.jpg", "image_11.jpg", "image_20.jpg"], sorted);
    }

    [Fact]
    public void LettersIgnoreCase()
    {
        string[] names = ["Zed", "abby", "Abel", "Aaron"];

        var sorted = names.OrderBy(name => name, NaturalStringComparer.Instance).ToArray();

        Assert.Equal(["Aaron", "abby", "Abel", "Zed"], sorted);
    }

    [Theory]
    [InlineData("a1", "a01")]
    [InlineData("Abby", "abby")]
    public void EquivalentKeysStillOrderDeterministically(string left, string right)
    {
        var forward = NaturalStringComparer.Instance.Compare(left, right);
        var backward = NaturalStringComparer.Instance.Compare(right, left);

        Assert.NotEqual(0, forward);
        Assert.Equal(-Math.Sign(forward), Math.Sign(backward));
    }

    [Fact]
    public void HandlesNullsPrefixesAndLongNumbers()
    {
        var comparer = NaturalStringComparer.Instance;

        Assert.True(comparer.Compare(null, "a") < 0);
        Assert.True(comparer.Compare("a", "a1") < 0);
        Assert.True(comparer.Compare("v99999999999999999999", "v100000000000000000000") < 0);
        Assert.Equal(0, comparer.Compare("same", "same"));
    }
}
