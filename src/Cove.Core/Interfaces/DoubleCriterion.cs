namespace Cove.Core.Interfaces;

/// <summary>A number criterion for fractional values (seconds, 0..1 confidences): the <see cref="IntCriterion"/> shape with doubles.</summary>
public class DoubleCriterion { public double Value { get; set; } public double? Value2 { get; set; } public CriterionModifier Modifier { get; set; } = CriterionModifier.Equals; }
