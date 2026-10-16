using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoProductionDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ProductionDate",
                table: "videos",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProductionDatePrecision",
                table: "videos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_videos_ProductionDate",
                table: "videos",
                column: "ProductionDate");

            // Date sorts treat undated videos as the oldest by ordering on COALESCE(date, '-infinity'), which
            // the plain date indexes cannot serve; these serve the first page in both directions. The plain
            // indexes stay for date filters.
            migrationBuilder.Sql("CREATE INDEX \"IX_videos_Date_undated_first\" ON \"videos\" (COALESCE(\"Date\", '-infinity'::date), \"Id\");");
            migrationBuilder.Sql("CREATE INDEX \"IX_videos_ProductionDate_undated_first\" ON \"videos\" (COALESCE(\"ProductionDate\", '-infinity'::date), \"Id\");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_videos_ProductionDate_undated_first\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_videos_Date_undated_first\";");

            migrationBuilder.DropIndex(
                name: "IX_videos_ProductionDate",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "ProductionDate",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "ProductionDatePrecision",
                table: "videos");
        }
    }
}
