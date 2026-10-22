using Cove.Data.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Cove.Api.Middleware;

public sealed class RelativeDateFilter(TimeProvider clock) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        using var evaluation = RelativeDateEvaluation.Begin(clock);
        var result = await next();
        // Both are ArgumentExceptions describing a filter the caller sent, so they are the caller's error.
        if (result.Exception is RelativeDateFilterException or FilterCriterionException)
        {
            result.Result = new BadRequestObjectResult(new { message = result.Exception.Message });
            result.ExceptionHandled = true;
        }
    }
}
