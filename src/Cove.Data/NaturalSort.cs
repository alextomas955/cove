using System.Reflection;
using Cove.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query.SqlExpressions;

namespace Cove.Data;

/// <summary>
/// Natural ordering for user-visible text sort keys: digit runs compare by value ("2" before "10")
/// and case only breaks ties. Wrap a string key in <see cref="Key"/> inside OrderBy/ThenBy; on
/// PostgreSQL it becomes <c>COLLATE "cove_natural"</c>, other providers keep their default order.
/// </summary>
public static class NaturalSort
{
    public const string CollationName = "cove_natural";
    public const string IcuLocale = "und-u-kn";

    internal static readonly MethodInfo KeyMethod = typeof(NaturalSort).GetMethod(nameof(Key))!;

    // The body only runs on providers that evaluate sort keys in memory.
    public static string? Key(string? value) => value;

    internal static void Configure(ModelBuilder modelBuilder, bool isNpgsql)
    {
        if (isNpgsql)
        {
            modelBuilder.HasCollation(CollationName, locale: IcuLocale, provider: "icu", deterministic: true);
            modelBuilder.HasDbFunction(KeyMethod)
                .HasTranslation(arguments => new CollateExpression(arguments[0], CollationName));

            // The default-collation indexes cannot serve a COLLATE ordering, so the large tables get
            // natural twins for their first-page title and path sorts.
            modelBuilder.Entity<Video>(builder =>
            {
                builder.HasIndex(video => video.Title, "IX_videos_Title_natural").UseCollation(CollationName);
                builder.HasIndex(video => video.MinPath, "IX_videos_MinPath_natural").UseCollation(CollationName);
                builder.HasIndex(video => video.MaxPath, "IX_videos_MaxPath_natural").UseCollation(CollationName);
            });
            modelBuilder.Entity<Image>(builder =>
            {
                builder.HasIndex(image => image.MinPath, "IX_images_MinPath_natural").UseCollation(CollationName);
                builder.HasIndex(image => image.MaxPath, "IX_images_MaxPath_natural").UseCollation(CollationName);
            });
        }
        else
        {
            modelBuilder.HasDbFunction(KeyMethod).HasTranslation(arguments => arguments[0]);
        }
    }
}
