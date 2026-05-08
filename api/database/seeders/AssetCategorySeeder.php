<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AssetCategory;
use Illuminate\Database\Seeder;

class AssetCategorySeeder extends Seeder
{
    private const CATEGORIES = [
        ['Laptop', 'laptop', 'Computers, notebooks, MacBooks'],
        ['Desktop', 'monitor', 'Workstations and all-in-ones'],
        ['Mobile Phone', 'smartphone', 'Company-issued mobile devices'],
        ['Tablet', 'tablet', 'iPads and tablets'],
        ['Monitor', 'monitor', 'External displays'],
        ['Headset', 'headphones', 'Audio peripherals'],
        ['Office Furniture', 'armchair', 'Chairs, desks, cabinets'],
        ['ID Card / Access', 'id-card', 'Building access cards'],
        ['Vehicle', 'car', 'Company vehicles'],
        ['Other', 'package', 'Miscellaneous equipment'],
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as [$name, $icon, $description]) {
            AssetCategory::updateOrCreate(['name' => $name], compact('icon', 'description'));
        }
    }
}
