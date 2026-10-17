using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Repositories;

/// <summary>Face query predicates shared by the faces list and the similar-faces endpoint.</summary>
public static class FaceQueryHelpers
{
    // A face has no file of its own, so a path criterion matches the files of the videos and images the face
    // appears in. Negated modifiers exclude a face seen in *any* matching file: "not under D:\Videos\Jane"
    // means "never appears in Jane's folder", not "also appears somewhere else".
    public static IQueryable<Face> ApplyAppearancePathCriterion(CoveContext db, IQueryable<Face> query, StringCriterion? criterion)
    {
        if (criterion is null)
            return query;

        var positiveModifier = criterion.Modifier switch
        {
            CriterionModifier.NotEquals => CriterionModifier.Equals,
            CriterionModifier.Excludes => CriterionModifier.Includes,
            CriterionModifier.NotMatchesRegex => CriterionModifier.MatchesRegex,
            CriterionModifier.NotUnderPath => CriterionModifier.UnderPath,
            var modifier => modifier,
        };
        var negated = positiveModifier != criterion.Modifier;
        var matching = new StringCriterion { Value = criterion.Value, Modifier = positiveModifier };

        var videoIds = FilterHelpers.ApplyFilePath(db.Videos.AsNoTracking(), matching, video => video.Files).Select(video => video.Id);
        var imageIds = FilterHelpers.ApplyFilePath(db.Images.AsNoTracking(), matching, image => image.Files).Select(image => image.Id);
        var matchingFaceIds = db.FaceAppearances
            .AsNoTracking()
            .Where(appearance =>
                (appearance.HostType == FaceAppearanceHostType.Video && videoIds.Contains(appearance.HostId))
                || (appearance.HostType == FaceAppearanceHostType.Image && imageIds.Contains(appearance.HostId)))
            .Select(appearance => appearance.FaceId);

        return negated
            ? query.Where(face => !matchingFaceIds.Contains(face.Id))
            : query.Where(face => matchingFaceIds.Contains(face.Id));
    }
}
