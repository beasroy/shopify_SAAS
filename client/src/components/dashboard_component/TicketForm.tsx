import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { Loader2, Mail, User, Building, Briefcase, MessageSquare, Send, X, AlertCircle } from "lucide-react"
import { Card, CardContent } from "../ui/card"
import { Skeleton } from "../ui/skeleton"

const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
 function TicketFormSkeleton() {
  return (
    <Card className="p-6 space-y-4">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TicketFormProps {
  onClose: () => void
}

function TicketForm({ onClose }: TicketFormProps) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    departmentId: "",
    brand: "",
    firstName: "",
    lastName: "",
    email: "",
  })

  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${baseURL}/api/zoho/departments`,{withCredentials: true})
        if (response.data && response.data.departments) {
          setDepartments(response.data.departments)
        }
      } catch (error) {
        console.error("Error fetching departments:", error)
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

    if (!form.subject.trim()) newErrors.subject = "Subject is required"
    if (!form.brand.trim()) newErrors.brand = "Brand name is required"
    if (!form.departmentId) newErrors.departmentId = "Please select a department"
    if (!form.description.trim()) newErrors.description = "Description is required"
    if (!form.firstName.trim()) newErrors.firstName = "First Name is required"
    if (!form.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address"
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
      const response = await axios.post(`${baseURL}/api/zoho/create-ticket`, form,{withCredentials: true})

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

  if (loading) {
    return (
      <TicketFormSkeleton />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" />
          Submit a Support Ticket
        </h2>
        <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {errors.form && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column - Essential information */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="subject">
                Subject <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={handleChange}
                  className={`pl-10 block w-full px-3 py-2.5 border ${errors.subject ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  placeholder="Brief description of your issue"
                />
              </div>
              {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="brand">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  value={form.brand}
                  onChange={handleChange}
                  className={`pl-10 block w-full px-3 py-2.5 border ${errors.brand ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  placeholder="Your brand name"
                />
              </div>
              {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="departmentId">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleChange}
                  className={`pl-10 block w-full px-3 py-2.5 border ${errors.departmentId ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 appearance-none bg-no-repeat bg-right`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value="">Select an issue type</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept?.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.departmentId && <p className="mt-1 text-sm text-red-600">{errors.departmentId}</p>}
            </div>
          </div>

          {/* Right column - Contact information */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange}
                    className="pl-10 block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="First name"
                  />
               
                </div>
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`pl-10 block w-full px-3 py-2.5 border ${errors.email ? "border-red-300 bg-red-50" : "border-slate-300"} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              <div className="h-full flex items-end">
              <div className="text-xs text-slate-500 italic">We'll use this email to contact you about your ticket</div>
            </div>
            </div>

            
          </div>
        </div>

        {/* Description - Full width */}
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
            placeholder="Please provide detailed information about your issue to help us assist you better"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 bg-slate-700 text-white py-2.5 px-4 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors ${
              submitting ? "opacity-70 cursor-not-allowed" : ""
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

