import Link from "next/link";
import Image from "next/image";
import { RiArrowRightLine, RiPhoneLine, RiMailLine } from "react-icons/ri";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  bio?: string;
  specialties?: string[];
}

export default function AgentsPreview({ agents }: { agents: Agent[] }) {
  if (!agents.length) return null;
  return (
    <section className="bg-[#F0D5A0]/25 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="section-label mb-3">Our Team</p>
            <h2 className="editorial-md text-[#372308]">
              Meet your
              <br />
              <span className="italic font-light text-[#8a7968]">agents</span>
            </h2>
          </div>
          <Link href="/agents" className="btn-outline group">
            All agents{" "}
            <RiArrowRightLine
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-[#F5F0E8] rounded-2xl overflow-hidden border border-[#372308]/6 hover:border-[#372308]/15 hover:shadow-sm transition-all group"
            >
              <div className="aspect-[3/4] relative bg-[#E8E0D0] overflow-hidden">
                {agent.photo_url ? (
                  <Image
                    src={agent.photo_url}
                    alt={agent.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-black text-6xl text-[#372308]/15">
                      {agent.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-[#372308] mb-0.5">
                  {agent.name}
                </p>
                <p className="text-xs text-[#8a7968] mb-3">Licensed Agent</p>
                <div className="flex gap-2">
                  {agent.phone && (
                    <a
                      href={`tel:${agent.phone}`}
                      className="w-7 h-7 rounded-full bg-[#372308]/6 hover:bg-[#372308] hover:text-[#F5F0E8] flex items-center justify-center text-[#372308] transition-all"
                    >
                      <RiPhoneLine size={12} />
                    </a>
                  )}
                  <a
                    href={`mailto:${agent.email}`}
                    className="w-7 h-7 rounded-full bg-[#372308]/6 hover:bg-[#372308] hover:text-[#F5F0E8] flex items-center justify-center text-[#372308] transition-all"
                  >
                    <RiMailLine size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
