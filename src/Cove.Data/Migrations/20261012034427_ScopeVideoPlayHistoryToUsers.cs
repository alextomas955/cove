using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    // Video play dates were one shared log: every user saw the same dates on a video's history, and removing the last
    // play or resetting plays deleted them for everyone, while play counts were already each user's own. Nearly every
    // date came from a Stash import, which counts the same plays for the owner it attributes its data to (the first
    // active, unlocked system user), so give the existing dates to that owner. An owner locked out by failed sign-ins
    // still owns them, and an install that never set up a system user falls back to its first Owner-role user. Only
    // with no owner at all is there no one to attribute the dates to.
    /// <inheritdoc />
    public partial class ScopeVideoPlayHistoryToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "video_play_history",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE video_play_history
                SET "UserId" = (
                    SELECT users."Id"
                    FROM users
                    WHERE users."IsSystem"
                       OR EXISTS (
                           SELECT 1
                           FROM user_role_assignments assignment
                           JOIN roles ON roles."Id" = assignment."RoleId"
                           WHERE assignment."UserId" = users."Id" AND roles."IsSystem")
                    ORDER BY users."IsSystem" DESC, (users."IsActive" AND NOT users."IsLocked") DESC, users."Id"
                    LIMIT 1);
                DELETE FROM video_play_history WHERE "UserId" IS NULL;
                """);

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "video_play_history",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_video_play_history_UserId_VideoId_PlayedAt",
                table: "video_play_history",
                columns: new[] { "UserId", "VideoId", "PlayedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_video_play_history_users_UserId",
                table: "video_play_history",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_video_play_history_users_UserId",
                table: "video_play_history");

            migrationBuilder.DropIndex(
                name: "IX_video_play_history_UserId_VideoId_PlayedAt",
                table: "video_play_history");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "video_play_history");
        }
    }
}
