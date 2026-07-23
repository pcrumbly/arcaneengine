import PartySetup from '@/components/party/PartySetup';
import PartyRoster from '@/components/party/PartyRoster';
export default function OperatorPartyPanel({data,busy,onCreate,onAdd,onRemove,onDisband}){return data.party?<PartyRoster {...data} busy={busy} onAdd={onAdd} onRemove={onRemove} onDisband={onDisband}/>:<PartySetup character={data.character} busy={busy} onCreate={onCreate}/>;}