import React from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Shield, Users, Wrench } from 'lucide-react';

export function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Find Trusted Reconstruction Experts
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Connect with skilled professionals for your renovation and reconstruction projects. Quality work, verified experts, and peace of mind.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started
              </Link>
              <a href="#how-it-works" className="text-sm font-semibold leading-6 text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">How It Works</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple Steps to Your Perfect Project
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Create Your Account
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Sign up as a customer or provider. Fill in your profile with relevant details about your needs or expertise.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Wrench className="h-6 w-6 text-white" />
                  </div>
                  Find the Right Match
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Browse through qualified providers or wait for project requests. Connect with the perfect match for your project.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Work with Confidence
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  All providers are verified. Clear communication and secure payment systems ensure a smooth experience.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                    <Hammer className="h-6 w-6 text-white" />
                  </div>
                  Complete Your Project
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Get your project done by skilled professionals. Review and rate your experience to help others.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}