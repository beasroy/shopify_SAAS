import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { Loader2, Building, MessageSquare, Send, X, AlertCircle, Briefcase } from "lucide-react"
import { useSelector } from "react-redux"
import { RootState } from "@/store"

const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL

interface TicketFormProps {
  onClose: () => void
}

function TicketForm({ onClose }: TicketFormProps) {
  const [form, setForm] = useState({
    brandName: "",
    description: "",
    departmentId: "",
  })

  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [zohoNotConfigured, setZohoNotConfigured] = useState(false)
  const selectedBrandId = useSelector((state: RootState) => state.brand.selectedBrandId)
  const brandName = useSelector((state: RootState) => state.brand.brands.find((brand) => brand._id === selectedBrandId)?.name)

  // Sync form state with Redux brandName
  useEffect(() => {
    if (brandName) {
      setForm((prev) => ({ ...prev, brandName: brandName }))
    }
  }, [brandName])

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true)
      setZohoNotConfigured(false)
      try {
        const response = await axios.get(`${baseURL}/api/zoho/departments`, { withCredentials: true })
        if (response.data && response.data.departments && response.data.departments.length > 0) {
          setDepartments(response.data.departments)
          // Automatically set the first department
          setForm((prev) => ({ ...prev, departmentId: response.data.departments[0].id }))
        }
      } catch (error: any) {
        console.error("Error fetching departments:", error)
        if (error.response?.status === 401 || error.response?.data?.message?.includes('Zoho integration not configured')) {
          setZohoNotConfigured(true)
        } else {
          setErrors({
            form: "Failed to load departments. Please try again later."
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDepartments()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is updated
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Use brandName from Redux if form.brandName is empty
    const currentBrandName = form.brandName || brandName || ""
    if (!currentBrandName.trim()) newErrors.brandName = "Brand name is required"
    if (!form.description.trim()) newErrors.description = "Description is required"
    if (!form.departmentId) {
      newErrors.departmentId = "Department is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // Use brandName from Redux if form.brandName is empty
      const finalBrandName = (form.brandName || brandName || "").trim();
      
      // Final validation before submit
      if (!finalBrandName) {
        setErrors({ brandName: "Brand name is required" });
        setSubmitting(false);
        return;
      }

      const submitData = {
        brandName: finalBrandName,
        description: form.description.trim(),
        departmentId: form.departmentId
      };

      console.log('Submitting ticket with data:', {
        brandName: submitData.brandName,
        hasDescription: !!submitData.description,
        departmentId: submitData.departmentId
      });

      const response = await axios.post(`${baseURL}/api/zoho/create-ticket`, submitData,{withCredentials: true})

      if (response.data.success) {
        onClose()
      }
    } catch (error) {
      console.error("Error submitting ticket:", error)
      setErrors({
        form: "There was an error submitting your tickets. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Submit your requirements
        </h2>
        <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {zohoNotConfigured && (
        <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 mb-1">Zoho Integration Not Configured</h3>
              <p className="text-sm text-yellow-700 mb-2">
                The Zoho integration needs to be set up before you can submit tickets. Please contact your administrator to configure Zoho.
              </p>
            </div>
          </div>
        </div>
      )}

      {errors.form && !zohoNotConfigured && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="brandName">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="brandName"
              name="brandName"
              type="text"
              value={form.brandName || brandName || ""}
              onChange={handleChange}
              readOnly={!!brandName}
              className={`pl-10 block w-full px-3 py-2.5 border ${errors.brandName ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 ${brandName ? "bg-slate-50 cursor-not-allowed" : ""}`}
              placeholder="Your brand name"
            />
          </div>
          {errors.brandName && <p className="mt-1 text-sm text-red-600">{errors.brandName}</p>}
        </div>

        {/* Department - Auto-selected from API */}
        {!loading && departments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={departments.find(dept => dept.id === form.departmentId)?.name || departments[0]?.name || "No department available"}
                readOnly
                className="pl-10 block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm bg-slate-50 cursor-not-allowed text-slate-600"
              />
            </div>
            {errors.departmentId && <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="description">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            className={`block w-full px-3 py-2.5 border ${errors.description ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
            placeholder="Please provide detailed information about your requirements"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting || zohoNotConfigured}
            className={`flex-1 bg-slate-700 text-white py-2.5 px-4 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors ${
              submitting || zohoNotConfigured ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Submit Ticket
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white text-slate-700 py-2.5 px-4 border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default TicketForm

