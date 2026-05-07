<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('app.super_admin_email', 'admin@ihris.local');
        $password = config('app.super_admin_password', 'ChangeMe!Now123');

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'first_name' => 'Super',
                'last_name' => 'Administrator',
                'password' => Hash::make($password),
                'status' => 'active',
                'email_verified_at' => now(),
            ],
        );

        $superAdmin = Role::where('name', 'super_admin')->firstOrFail();
        $user->roles()->syncWithoutDetaching([$superAdmin->id]);
    }
}
