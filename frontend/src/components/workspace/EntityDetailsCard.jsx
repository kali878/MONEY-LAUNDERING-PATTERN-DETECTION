import React, { useState } from 'react';
import { User, Landmark, Home, Briefcase, Mail, Phone, Calendar, Hash } from 'lucide-react';

// Mock data representing a consolidated view for 'Arjun Verma' from various CSVs
const mockEntityData = {
  personal: {
    person_id: 'PER-001',
    full_name: 'Arjun Verma',
    dob: '1985-05-20',
    pan_number: 'ABCDE1234F',
    address: '123, Cyber Lane, Neo Delhi, 110001',
    tax_filing_status: 'Filed'
  },
  financial: {
    monthly_salary_inr: 50000,
    accounts: [
      { account_number: 'xxxx-xxxx-1234', bank_name: 'Cyber National Bank', balance_inr: 75000 },
      { account_number: 'xxxx-xxxx-5678', bank_name: 'Digital Trust Bank', balance_inr: 120000 }
    ]
  },
  assets: [
    { property_id: 'PROP-042', address: '456, Future Towers, Neo Delhi', purchase_value_inr: 9500000, purchase_date: '2024-11-15' }
  ],
  corporate: [
    { cin: 'U74999DL2024PTC12345', company_name: 'Zenith Global Exports', appointment_date: '2024-09-01' }
  ]
};

const TabButton = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500
      ${active ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700/50'}
    `}
  >
    {children}
  </button>
);

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start py-3 border-b border-gray-700/50">
        <Icon className="h-5 w-5 text-cyan-400 mt-1 flex-shrink-0" />
        <div className="ml-4">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-md font-medium text-gray-100">{value}</p>
        </div>
    </div>
);

const EntityDetailsCard = ({ entityData = mockEntityData }) => {
  const [activeTab, setActiveTab] = useState('personal');

  const totalBalance = entityData.financial.accounts.reduce((sum, acc) => sum + acc.balance_inr, 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'financial':
        return (
             <div>
                <InfoRow icon={Landmark} label="Declared Monthly Salary" value={`₹ ${entityData.financial.monthly_salary_inr.toLocaleString('en-IN')}`} />
                <InfoRow icon={Landmark} label="Combined Bank Balance" value={`₹ ${totalBalance.toLocaleString('en-IN')}`} />
                <h4 className="mt-4 mb-2 text-lg font-semibold text-gray-300">Bank Accounts</h4>
                {entityData.financial.accounts.map(acc => (
                    <div key={acc.account_number} className="p-3 bg-black/30 rounded-md mb-2">
                        <p className="font-semibold text-white">{acc.bank_name}</p>
                        <p className="text-sm text-gray-400">{acc.account_number} - Balance: ₹ {acc.balance_inr.toLocaleString('en-IN')}</p>
                    </div>
                ))}
             </div>
        );
      case 'assets':
        return (
            <div>
                 {entityData.assets.map(asset => (
                    <div key={asset.property_id} className="p-3 bg-black/30 rounded-md mb-2">
                        <p className="font-semibold text-white">{asset.address}</p>
                        <p className="text-sm text-gray-400">Purchase Value: ₹ {asset.purchase_value_inr.toLocaleString('en-IN')}</p>
                        <p className="text-sm text-gray-400">Purchase Date: {asset.purchase_date}</p>
                    </div>
                 ))}
            </div>
        );
      case 'corporate':
        return (
            <div>
                {entityData.corporate.map(corp => (
                    <div key={corp.cin} className="p-3 bg-black/30 rounded-md mb-2">
                        <p className="font-semibold text-white">{corp.company_name}</p>
                        <p className="text-sm text-gray-400">CIN: {corp.cin}</p>
                        <p className="text-sm text-gray-400">Appointment Date: {corp.appointment_date}</p>
                    </div>
                 ))}
            </div>
        );
      case 'personal':
      default:
        return (
            <div>
                <InfoRow icon={User} label="Full Name" value={entityData.personal.full_name} />
                <InfoRow icon={Calendar} label="Date of Birth" value={entityData.personal.dob} />
                <InfoRow icon={Hash} label="PAN Number" value={entityData.personal.pan_number} />
                <InfoRow icon={Mail} label="Registered Address" value={entityData.personal.address} />
                <InfoRow icon={Phone} label="Tax Filing Status" value={entityData.personal.tax_filing_status} />
            </div>
        );
    }
  };

  return (
    <div className="w-full bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 animate-fadeIn mt-6">
      <div className="p-4 flex items-center justify-between border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-cyan-300">Entity 360° Profile</h2>
          <div className="flex items-center space-x-2 p-1 bg-gray-800/70 rounded-lg">
              <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')}><User size={16} className="mr-2"/>Personal</TabButton>
              <TabButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')}><Landmark size={16} className="mr-2"/>Financial</TabButton>
              <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')}><Home size={16} className="mr-2"/>Assets</TabButton>
              <TabButton active={activeTab === 'corporate'} onClick={() => setActiveTab('corporate')}><Briefcase size={16} className="mr-2"/>Corporate</TabButton>
          </div>
      </div>
      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default EntityDetailsCard;
