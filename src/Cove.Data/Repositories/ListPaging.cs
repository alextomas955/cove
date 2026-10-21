namespace Cove.Data.Repositories;

/// <summary>Paging limits shared by the list endpoints and the repositories behind them.</summary>
public static class ListPaging
{
    /// <summary>
    /// The largest page a list hands out. It matches the largest preset in the UI's page-size picker
    /// (<c>LIST_PER_PAGE_OPTIONS</c> in <c>ui/src/components/listToolbarStyles.ts</c>), so every offered size
    /// is honoured, while an extension still cannot ask for the whole library as one page.
    /// </summary>
    public const int MaxPerPage = 1000;
}
