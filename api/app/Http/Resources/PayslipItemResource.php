<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\PayslipItem */
class PayslipItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'code' => $this->code,
            'label' => $this->label,
            'quantity' => (float) $this->quantity,
            'rate' => (float) $this->rate,
            'amount' => (float) $this->amount,
            'is_taxable' => (bool) $this->is_taxable,
            'meta' => $this->meta,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
