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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProductionDate",
                table: "videos");

            migrationBuilder.DropColumn(
                name: "ProductionDatePrecision",
                table: "videos");
        }
    }
}
