import axiosInstance from "@/lib/axios";
import {
  type CommunicationCenterSnapshot,
  type CommunicationCampaign,
} from "@tzdraft/shared-client";

export const communicationCenterService = {
  async getSnapshot(): Promise<CommunicationCenterSnapshot> {
    const response = await axiosInstance.get("/admin/communication/snapshot");
    return response.data;
  },

  async createCampaign(dto: any): Promise<CommunicationCampaign> {
    const response = await axiosInstance.post("/admin/communication/campaigns", dto);
    return response.data;
  },

  async saveDraft(dto: any): Promise<CommunicationCampaign> {
    const response = await axiosInstance.post("/admin/communication/campaigns/draft", dto);
    return response.data;
  },

  async updateCampaign(id: string, dto: any): Promise<CommunicationCampaign> {
    const response = await axiosInstance.patch(`/admin/communication/campaigns/${id}`, dto);
    return response.data;
  },

  async pauseCampaign(id: string): Promise<CommunicationCampaign> {
    const response = await axiosInstance.patch(`/admin/communication/campaigns/${id}/pause`);
    return response.data;
  },

  async deleteCampaign(id: string): Promise<void> {
    await axiosInstance.delete(`/admin/communication/campaigns/${id}`);
  },
};
