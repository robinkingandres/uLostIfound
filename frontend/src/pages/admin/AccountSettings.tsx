export default function AccountSettings() {
  return (
    <div className="p-8">
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Profile</h2>
          {/* Put your form here */}
          <div className="grid gap-3 max-w-2xl">
            <input className="border rounded-lg px-3 py-2" placeholder="Name" />
            <input className="border rounded-lg px-3 py-2" placeholder="Email" />
            <input className="border rounded-lg px-3 py-2" placeholder="Current password" type="password" />
            <input className="border rounded-lg px-3 py-2" placeholder="New password" type="password" />
            <button className="bg-blue-600 text-white rounded-lg px-4 py-2 w-fit">
              Update Profile
            </button>
          </div>
        </div>
    </div>
  );
}
