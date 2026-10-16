using System.Linq.Expressions;
using Cove.Core.Entities;
using Cove.Core.Interfaces;

namespace Cove.Data.Repositories;

/// <summary>
/// A performer's age when a video was made: on its production date, or on its release date when it has
/// none. A video without either date, or a performer without a birthdate, has no age: it fails every
/// comparison except <see cref="CriterionModifier.IsNull"/> and sorts after every known age.
/// </summary>
internal static class VideoPerformerAge
{
    private static readonly Expression<Func<Video, VideoPerformer, int?>> Age = (video, link) =>
        (video.ProductionDate ?? video.Date) == null || link.Performer!.Birthdate == null
            ? null
            : (video.ProductionDate ?? video.Date)!.Value.Year - link.Performer.Birthdate.Value.Year
                - (((video.ProductionDate ?? video.Date)!.Value.Month < link.Performer.Birthdate.Value.Month
                    || ((video.ProductionDate ?? video.Date)!.Value.Month == link.Performer.Birthdate.Value.Month
                        && (video.ProductionDate ?? video.Date)!.Value.Day < link.Performer.Birthdate.Value.Day)) ? 1 : 0);

    /// <summary>The age comparison for <paramref name="criterion"/>, or null for an unsupported modifier.</summary>
    public static Expression<Func<int?, bool>>? Comparison(IntCriterion criterion)
    {
        var value = criterion.Value;
        var value2 = criterion.Value2 ?? value;
        return criterion.Modifier switch
        {
            CriterionModifier.Equals => age => age == value,
            CriterionModifier.NotEquals => age => age < value || age > value,
            CriterionModifier.GreaterThan => age => age > value,
            CriterionModifier.LessThan => age => age < value,
            CriterionModifier.Between => age => age >= value && age <= value2,
            CriterionModifier.NotBetween => age => age < value || age > value2,
            CriterionModifier.IsNull => age => age == null,
            CriterionModifier.NotNull => age => age != null,
            _ => null,
        };
    }

    /// <summary>Links whose performer's age on their video's date satisfies <paramref name="comparison"/>.</summary>
    public static IQueryable<VideoPerformer> WhereLinks(IQueryable<VideoPerformer> links, Expression<Func<int?, bool>> comparison)
    {
        var link = Expression.Parameter(typeof(VideoPerformer), "link");
        var age = Inline(Age, Expression.Property(link, nameof(VideoPerformer.Video)), link);
        return links.Where(Expression.Lambda<Func<VideoPerformer, bool>>(Inline(comparison, age), link));
    }

    /// <summary>Videos with at least one performer whose age on the video's date satisfies <paramref name="comparison"/>.</summary>
    public static IQueryable<Video> WhereAnyPerformer(IQueryable<Video> videos, Expression<Func<int?, bool>> comparison)
    {
        var video = Expression.Parameter(typeof(Video), "video");
        var link = Expression.Parameter(typeof(VideoPerformer), "link");
        var matches = Expression.Lambda<Func<VideoPerformer, bool>>(Inline(comparison, Inline(Age, video, link)), link);
        var any = Expression.Call(
            typeof(Enumerable),
            nameof(Enumerable.Any),
            [typeof(VideoPerformer)],
            Expression.Property(video, nameof(Video.VideoPerformers)),
            matches);
        return videos.Where(Expression.Lambda<Func<Video, bool>>(any, video));
    }

    /// <summary>The oldest (<paramref name="oldest"/>) or youngest performer age on each video's date.</summary>
    public static Expression<Func<Video, int?>> Extreme(bool oldest)
    {
        var video = Expression.Parameter(typeof(Video), "video");
        var link = Expression.Parameter(typeof(VideoPerformer), "link");
        var ages = Expression.Call(
            typeof(Enumerable),
            nameof(Enumerable.Select),
            [typeof(VideoPerformer), typeof(int?)],
            Expression.Property(video, nameof(Video.VideoPerformers)),
            Expression.Lambda<Func<VideoPerformer, int?>>(Inline(Age, video, link), link));
        var aggregate = typeof(Enumerable).GetMethod(oldest ? nameof(Enumerable.Max) : nameof(Enumerable.Min), [typeof(IEnumerable<int?>)])!;
        return Expression.Lambda<Func<Video, int?>>(Expression.Call(aggregate, ages), video);
    }

    private static Expression Inline(LambdaExpression lambda, params Expression[] arguments)
        => new ParameterInliner(lambda.Parameters, arguments).Visit(lambda.Body)!;

    private sealed class ParameterInliner(IReadOnlyList<ParameterExpression> parameters, IReadOnlyList<Expression> arguments) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
        {
            for (var i = 0; i < parameters.Count; i++)
                if (node == parameters[i]) return arguments[i];
            return base.VisitParameter(node);
        }
    }
}
