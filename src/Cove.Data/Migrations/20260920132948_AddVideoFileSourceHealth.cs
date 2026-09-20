using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cove.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoFileSourceHealth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SourceUnreadableAt",
                table: "files",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceUnreadableReason",
                table: "files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SourceUnreadableSize",
                table: "files",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceUnreadableAt",
                table: "files");

            migrationBuilder.DropColumn(
                name: "SourceUnreadableReason",
                table: "files");

            migrationBuilder.DropColumn(
                name: "SourceUnreadableSize",
                table: "files");
        }
    }
}
