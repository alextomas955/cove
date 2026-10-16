using Cove.Core.Entities;
using Cove.Data;
using Microsoft.EntityFrameworkCore;

namespace Cove.ApiTests.Infrastructure;

// Migration tests seed rows into a database migrated only up to an earlier migration, but the current model
// writes every video column, including ones that schema does not have yet. This context leaves out the
// ProductionDate and ProductionDatePrecision columns, so it can seed videos into a schema from AddVideoVrDescriptor
// up to, but not including, AddVideoProductionDate. Migrate and read through a plain CoveContext: the migrations
// belong to that type.
public sealed class PreProductionDateCoveContext(DbContextOptions<CoveContext> options) : CoveContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Video>(video =>
        {
            video.Ignore(entity => entity.ProductionDate);
            video.Ignore(entity => entity.ProductionDatePrecision);
        });
    }
}
