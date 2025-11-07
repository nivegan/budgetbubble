//
// 📄 NEW FILE: figmav1/src/components/SavingsGoals.tsx
//
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Pockets } from './Pockets';
import { Subscriptions } from './Subscriptions';

export function SavingsGoals(props: any) {
  return (
    <Tabs defaultValue="pockets" className="w-full">
      <TabsList className="bg-[#34495e] border-[#577189]">
        <TabsTrigger value="pockets" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
          Pockets
        </TabsTrigger>
        <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#3d5a80] data-[state=active]:text-white">
          Subscriptions
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pockets" className="mt-6">
        <Pockets {...props} />
      </TabsContent>
      <TabsContent value="subscriptions" className="mt-6">
        <Subscriptions {...props} />
      </TabsContent>
    </Tabs>
  );
}