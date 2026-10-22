import AgentForm from '../AgentForm'
export default function NewAgentPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">Add New Agent</h1>
        <p className="text-[#8a7968] text-sm mt-1">Add a new agent to your team</p>
      </div>
      <AgentForm />
    </div>
  )
}
