<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Recruitment;

use App\Http\Controllers\Controller;
use App\Services\Recruitment\RecruitmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class RecruitmentAnalyticsController extends Controller
{
    public function __construct(private RecruitmentService $service) {}

    public function index(): JsonResponse
    {
        return ApiResponse::success($this->service->getAnalytics());
    }
}
