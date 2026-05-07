<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Employee;
use App\Models\User;
use App\Repositories\EmployeeRepository;
use App\Services\Audit\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmployeeService
{
    public function __construct(
        private EmployeeRepository $repo,
        private AuditLogger $audit,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->repo->paginate($filters);
    }

    public function find(string $id): Employee
    {
        $employee = $this->repo->findById($id);

        if (! $employee) {
            abort(404, 'Employee not found.');
        }

        return $employee;
    }

    /**
     * @param  array<string, mixed>  $data  Validated data from StoreEmployeeRequest.
     */
    public function create(array $data, User $actor): Employee
    {
        // If no user_id but identity fields are provided, auto-create a linked User.
        if (empty($data['user_id']) && !empty($data['first_name'])) {
            $user = User::create([
                'first_name'  => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name'   => $data['last_name'],
                'email'       => $data['email'],
                'phone'       => $data['phone'] ?? null,
                'password'    => Hash::make(Str::random(32)),
                'status'      => 'active',
            ]);
            $data['user_id'] = $user->id;
        }

        $employeeData = Arr::except($data, ['first_name', 'middle_name', 'last_name', 'email', 'phone']);

        // Auto-generate employee number if not supplied.
        if (empty($employeeData['employee_number'])) {
            $employeeData['employee_number'] = $this->repo->nextEmployeeNumber();
        } elseif ($this->repo->findByEmployeeNumber($employeeData['employee_number'])) {
            throw ValidationException::withMessages([
                'employee_number' => ['This employee number is already taken.'],
            ]);
        }

        $employee = $this->repo->create($employeeData);

        $this->audit->log(
            'employee.created',
            target: $employee,
            after: $employee->toArray(),
            actor: $actor,
        );

        return $employee->load(['user', 'department', 'position', 'manager.user']);
    }

    /**
     * @param  array<string, mixed>  $data  Validated data from UpdateEmployeeRequest.
     */
    public function update(string $id, array $data, User $actor): Employee
    {
        $employee = $this->find($id);

        $before = $employee->toArray();

        // Prevent changing employee_number to one already taken by another record.
        if (
            isset($data['employee_number'])
            && $data['employee_number'] !== $employee->employee_number
        ) {
            $conflict = $this->repo->findByEmployeeNumber($data['employee_number']);
            if ($conflict && $conflict->id !== $employee->id) {
                throw ValidationException::withMessages([
                    'employee_number' => ['This employee number is already taken.'],
                ]);
            }
        }

        $updated = $this->repo->update($employee, Arr::except($data, ['first_name', 'middle_name', 'last_name', 'email', 'phone']));

        // Propagate identity changes to the linked User record.
        $identityFields = Arr::only($data, ['first_name', 'middle_name', 'last_name', 'email', 'phone']);
        if (!empty($identityFields) && $updated->user_id) {
            $updated->user?->update(array_filter($identityFields, fn ($v) => $v !== null));
        }

        $this->audit->log(
            'employee.updated',
            target: $updated,
            before: $before,
            after: $updated->toArray(),
            actor: $actor,
        );

        return $updated;
    }

    public function delete(string $id, User $actor): void
    {
        $employee = $this->find($id);

        $this->audit->log(
            'employee.deleted',
            target: $employee,
            before: $employee->toArray(),
            actor: $actor,
        );

        $this->repo->softDelete($employee);
    }

    public function allActive(): Collection
    {
        return $this->repo->allActive();
    }
}
