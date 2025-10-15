import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Transactions } from './Transactions';
import { Holdings } from './Holdings';
import { Subscriptions } from './Subscriptions';

interface FinancesProps {
  accessToken: string;
  householdId: string;
  isPersonalView: boolean;
}

export function Finances({ accessToken, householdId, isPersonalView }: FinancesProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-white">Financial Management</h2>
      
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-[#3d5a80] border border-[#577189]">
          <TabsTrigger 
            value="transactions" 
            className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger 
            value="holdings" 
            className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]"
          >
            Assets & Investments
          </TabsTrigger>
          <TabsTrigger 
            value="subscriptions" 
            className="data-[state=active]:bg-[#69d2bb] data-[state=active]:text-[#2c3e50]"
          >
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6">
          <Transactions
            accessToken={accessToken}
            householdId={householdId}
            isPersonalView={isPersonalView}
          />
        </TabsContent>

        <TabsContent value="holdings" className="mt-6">
          <Holdings
            accessToken={accessToken}
            householdId={householdId}
            isPersonalView={isPersonalView}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Subscriptions
            accessToken={accessToken}
            householdId={householdId}
            isPersonalView={isPersonalView}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
